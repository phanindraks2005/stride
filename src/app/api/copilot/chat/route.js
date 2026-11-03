import { NextResponse } from 'next/server'
import { buildUserContext } from '../../../../lib/context-builder'
import { toolDefinitions } from '../../../../lib/tools'
import { executeTool } from '../../../../lib/tool-executor'
import { supabaseServer } from '../../../../lib/supabase-server'
import { generate, aiError, BUDGET_MS } from '../../../../lib/gemini'

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 2000

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
  let call, toolResult

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

    call = functionCalls[0]
    toolResult = await executeTool(call.name, call.args, userId)

    const modelTurn = response.candidates[0].content

    const followUp = await generate({
      contents: [
        { role: 'user', parts: [{ text: message }] },
        modelTurn,
        {
          role: 'user',
          parts: [{ functionResponse: { name: call.name, response: toolResult } }],
        },
      ],
      config: {
        systemInstruction: systemContext,
      },
    }, deadline)

    return NextResponse.json({
      reply: followUp.text,
      toolUsed: call.name,
      artifact: toolResult.artifact || null,
    })
  } catch (error) {
    console.error('Copilot error:', error)

    // The tool already ran (an entry may be logged), so report what it did
    // rather than an error the user would answer by asking again.
    if (toolResult) {
      return NextResponse.json({
        reply: toolResult.artifact ? 'Here it is.' : toolResult.message,
        toolUsed: call.name,
        artifact: toolResult.artifact || null,
      })
    }

    const { message: friendly, status } = aiError(error)
    return NextResponse.json({ error: friendly }, { status })
  }
}
