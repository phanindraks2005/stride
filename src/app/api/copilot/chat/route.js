import { NextResponse } from 'next/server'
import { buildUserContext } from '../../../../lib/context-builder'
import { toolDefinitions } from '../../../../lib/tools'
import { executeTool } from '../../../../lib/tool-executor'
import { supabaseServer } from '../../../../lib/supabase-server'
import { generate, aiError, BUDGET_MS } from '../../../../lib/gemini'

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 2000
const MAX_TOOL_CALLS = 5

const REPORT_RULES = `You just ran the tools above. Each response says whether it worked (success: true) or not (success: false, with the reason).
Report only what actually happened: mention each action that worked, and for each one that failed, say which one and why.
Never say something was logged or created unless its response has success: true.`

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

  return {
    reply,
    toolsUsed: results.map(({ call }) => call.name),
    artifact,
  }
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
  const results = []

  try {
    const systemContext = await buildUserContext(userId)

    const response = await generate({
      contents: message,
      config: {
        systemInstruction: systemContext,
        tools: [{ functionDeclarations: toolDefinitions }],
      },
    }, deadline)

    const functionCalls = response.functionCalls

    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({ reply: response.text })
    }

    // "Log 300 ml water and 20 g protein" comes back as one call per entry.
    // Run them all, in order; one failing doesn't stop the rest.
    for (const call of functionCalls.slice(0, MAX_TOOL_CALLS)) {
      let result
      try {
        result = await executeTool(call.name, call.args, userId)
      } catch (err) {
        console.error(`Tool ${call.name} failed:`, err)
        result = { success: false, message: 'Something went wrong while doing this.' }
      }
      results.push({ call, result })
    }

    const modelTurn = response.candidates[0].content

    // Every call needs its own response, or the model guesses at the missing
    // ones and can claim things that never happened.
    const followUp = await generate({
      contents: [
        { role: 'user', parts: [{ text: message }] },
        modelTurn,
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
    }, deadline)

    return NextResponse.json(toolReply(results, followUp.text))
  } catch (error) {
    console.error('Copilot error:', error)

    // Tools already ran (entries may be logged), so report what they did
    // rather than an error the user would answer by asking again.
    if (results.length > 0) {
      return NextResponse.json(toolReply(results, null))
    }

    const { message: friendly, status } = aiError(error)
    return NextResponse.json({ error: friendly }, { status })
  }
}
