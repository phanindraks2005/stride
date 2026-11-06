import { NextResponse } from 'next/server'
import { buildUserContext } from '../../../../lib/context-builder'
import { toolDefinitions } from '../../../../lib/tools'
import { executeTool } from '../../../../lib/tool-executor'
import { supabaseServer } from '../../../../lib/supabase-server'
import { generateStream, aiError, BUDGET_MS } from '../../../../lib/gemini'

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 2000
const MAX_TOOL_CALLS = 5

// Earlier turns sent with each message, so follow-ups ("make it shorter") work.
// Bounded by count and characters to keep every request small.
const HISTORY_MESSAGES = 10
const HISTORY_MESSAGE_CHARS = 1200
const HISTORY_TOTAL_CHARS = 8000

// A saved plan as one compact line, so "swap bench for dumbbells" has something to edit
function planText(artifact) {
  if (artifact?.type === 'workout_plan') {
    const items = (artifact.exercises || []).map((e) => [e.name, e.sets && `${e.sets}x${e.reps || ''}`].filter(Boolean).join(' '))
    return `[Workout plan shown: ${artifact.title}: ${items.join('; ')}]`
  }
  if (artifact?.type === 'meal_plan') {
    const items = (artifact.meals || []).map((m) => [m.name, m.protein_g && `${m.protein_g} g protein`, m.calories && `${m.calories} kcal`].filter(Boolean).join(', '))
    return `[Meal plan shown: ${artifact.title}: ${items.join('; ')}]`
  }
  return ''
}

// The last few turns as Gemini contents, oldest first. The page saves the
// user's message before calling this route, so that row is the current
// message and is left out. Turns from the same side are merged, since a
// failed reply is never saved and Gemini expects user and model to alternate.
async function loadHistory(userId, message) {
  const { data, error } = await supabaseServer
    .from('messages')
    .select('role, content, artifact')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_MESSAGES + 1)
  if (error || !data) return []

  const rows = data[0]?.role === 'user' && data[0].content.trim() === message ? data.slice(1) : data.slice(0, HISTORY_MESSAGES)
  const turns = []
  let budget = HISTORY_TOTAL_CHARS
  for (const row of rows.slice(0, HISTORY_MESSAGES)) {
    let text = [row.content, planText(row.artifact)].filter(Boolean).join('\n')
    if (text.length > HISTORY_MESSAGE_CHARS) text = text.slice(0, HISTORY_MESSAGE_CHARS) + '…'
    if (text.length > budget) break
    budget -= text.length
    const role = row.role === 'assistant' ? 'model' : 'user'
    const newer = turns[0]
    if (newer?.role === role) newer.parts[0].text = `${text}\n\n${newer.parts[0].text}`
    else turns.unshift({ role, parts: [{ text }] })
  }
  // Must open with the user and end with the model, before the new message
  while (turns[0]?.role === 'model') turns.shift()
  if (turns[turns.length - 1]?.role === 'user') turns.pop()
  return turns
}

const REPORT_RULES = `You just ran the tools above. Each response says whether it worked (success: true) or not (success: false, with the reason).
Report only what actually happened: mention each action that worked, and for each one that failed, say which one and why.
Never say something was logged or created unless its response has success: true.
A meal or workout plan you generate is shown as a card right below your reply, so don't repeat its items and never say it is above.`

// The reply sent to the chat. Actions (logging, creating trackers) are listed
// from their real results, so the text can't claim one that failed; the model's
// own wording is used when it agrees with them.
function toolReply(results, modelText) {
  const actions = results.filter(({ result }) => !result.artifact)
  const failed = actions.filter(({ result }) => !result.success)
  const artifact = results.find(({ result }) => result.artifact)?.result.artifact || null

  let reply = modelText?.trim()
  if (!reply) {
    reply = actions.length > 0
      ? actions.map(({ result }) => (result.success ? `${result.message}.` : `Couldn't do that: ${result.message}.`)).join('\n')
      : 'Here it is.'
  } else {
    // Make sure every failure is named, whatever the model wrote.
    const unmentioned = failed.filter(({ call }) => {
      const subject = String(call.args?.tracker_name || call.args?.name || '').toLowerCase()
      return !subject || !reply.toLowerCase().includes(subject)
    })
    if (unmentioned.length > 0) {
      reply += '\n\n' + unmentioned.map(({ result }) => `Couldn't do that: ${result.message}.`).join('\n')
    }
  }

  // Chips under the reply, one per action, in the tracker's colour
  const chips = actions.map(({ call, result }) => ({
    kind: call.name === 'create_tracker' ? 'create' : 'log',
    success: !!result.success,
    tracker: result.tracker?.name || call.args?.tracker_name || call.args?.name || '',
    unit: result.tracker?.unit || call.args?.unit || '',
    color: result.tracker?.color || null,
    value: result.value ?? call.args?.value ?? call.args?.target_value ?? null,
  }))

  return {
    reply,
    toolsUsed: results.map(({ call }) => call.name),
    artifact,
    actions: chips,
  }
}

// The reply streams as newline-delimited JSON events:
//   { type: 'delta', text }   more words of the reply
//   { type: 'reset' }         drop what was streamed (the model chose a tool instead)
//   { type: 'tools', names }  tools are running
//   { type: 'done', reply, artifact, actions }   the final reply, replaces the streamed text
//   { type: 'error', error }  a message that's fine to show
function eventStream(run) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        await run(send)
      } finally {
        controller.close()
      }
    },
  }), {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(request) {
  const deadline = Date.now() + BUDGET_MS

  // The service-role client bypasses RLS, so the user id must come from a
  // verified token, never from the request body.
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'Type a message for Libra first.' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `That message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 })
  }

  const userId = user.id

  return eventStream(async (send) => {
    const results = []
    const delta = (text) => send({ type: 'delta', text })

    try {
      const [systemContext, history] = await Promise.all([buildUserContext(userId), loadHistory(userId, message)])
      const userTurn = { role: 'user', parts: [{ text: message }] }

      const first = await generateStream({
        contents: [...history, userTurn],
        config: {
          systemInstruction: systemContext,
          tools: [{ functionDeclarations: toolDefinitions }],
        },
      }, deadline, delta)

      if (first.functionCalls.length === 0) {
        if (!first.text.trim()) throw new Error('Empty reply')
        send({ type: 'done', reply: first.text, artifact: null, actions: [] })
        return
      }

      if (first.text) send({ type: 'reset' })
      const calls = first.functionCalls.slice(0, MAX_TOOL_CALLS)
      send({ type: 'tools', names: calls.map((c) => c.name) })

      // "Log 300 ml water and 20 g protein" comes back as one call per entry.
      // Run them all, in order; one failing doesn't stop the rest.
      for (const call of calls) {
        let result
        try {
          result = await executeTool(call.name, call.args, userId)
        } catch (err) {
          console.error(`Tool ${call.name} failed:`, err)
          result = { success: false, message: 'Something went wrong while doing this.' }
        }
        results.push({ call, result })
      }

      // Every call needs its own response, or the model guesses at the missing
      // ones and can claim things that never happened.
      const followUp = await generateStream({
        contents: [
          ...history,
          userTurn,
          first.content,
          {
            role: 'user',
            parts: results.map(({ call, result }) => ({
              functionResponse: { id: call.id, name: call.name, response: result },
            })),
          },
        ],
        config: {
          systemInstruction: `${systemContext}\n\n${REPORT_RULES}`,
        },
      }, deadline, delta)

      send({ type: 'done', ...toolReply(results, followUp.text) })
    } catch (error) {
      console.error('Copilot error:', error)

      // Tools already ran (entries may be logged), so report what they did
      // rather than an error the user would answer by asking again.
      if (results.length > 0) {
        send({ type: 'done', ...toolReply(results, null) })
        return
      }

      send({ type: 'error', error: aiError(error).message })
    }
  })
}
