import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { buildUserContext } from '../../../../lib/context-builder'
import { toolDefinitions } from '../../../../lib/tools'
import { executeTool } from '../../../../lib/tool-executor'
import { supabaseServer } from '../../../../lib/supabase-server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request) {
  try {
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

    const userId = user.id
    const { message } = await request.json()

    const systemContext = await buildUserContext(userId)

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: message,
      config: {
        systemInstruction: systemContext,
        tools: [{ functionDeclarations: toolDefinitions }],
      },
    })

    const functionCalls = response.functionCalls

    if (!functionCalls || functionCalls.length === 0) {
      return NextResponse.json({ reply: response.text })
    }

    const call = functionCalls[0]
    const toolResult = await executeTool(call.name, call.args, userId)

    const modelTurn = response.candidates[0].content

    const followUp = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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
    })

    return NextResponse.json({
      reply: followUp.text,
      toolUsed: call.name,
      artifact: toolResult.artifact || null,
    })
  } catch (error) {
    console.error('Copilot error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}