import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Pinned rather than gemini-flash-latest: the alias moves to each new release,
// which on this key has hit quota limits and capacity errors for hours at a time.
const PRIMARY_MODEL = 'gemini-3.5-flash'
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'

// An overloaded model can hang for minutes. Each attempt gets ATTEMPT_MS, and a
// whole chat request (up to two calls when Libra uses a tool) stays inside
// BUDGET_MS, so the browser, which gives up at 60 s, always gets an answer.
const ATTEMPT_MS = 20_000
export const BUDGET_MS = 50_000
const MIN_ATTEMPT_MS = 4_000

// Busy or out of quota: worth trying again, first on the other model (limits
// are per model), then once more on the primary after a short pause.
const ATTEMPTS = [
  { model: PRIMARY_MODEL, delay: 0 },
  { model: FALLBACK_MODEL, delay: 0 },
  { model: PRIMARY_MODEL, delay: 1_500 },
]

export class AiTimeout extends Error {}

function isBusy(err) {
  return err?.status === 503 || err?.status === 429
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function generate(request, deadline) {
  let lastError
  for (const { model, delay } of ATTEMPTS) {
    if (delay) await sleep(delay)
    const left = deadline - Date.now()
    if (left < MIN_ATTEMPT_MS) break

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_MS, left))
    try {
      return await ai.models.generateContent({
        ...request,
        model,
        config: { ...request.config, abortSignal: controller.signal },
      })
    } catch (err) {
      lastError = controller.signal.aborted ? new AiTimeout() : err
      if (!isBusy(err) && !controller.signal.aborted) throw err
      console.warn(`${model} ${controller.signal.aborted ? 'timed out' : `returned ${err.status}`}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError || new AiTimeout()
}

// Maps any failure to a message that's fine to show in the chat. Raw SDK errors
// carry Google's JSON, status text and URLs, which users should never see.
export function aiError(err) {
  if (err instanceof AiTimeout) {
    return { message: 'Libra is taking longer than usual. Please try again in a minute.', status: 504 }
  }
  if (isBusy(err)) {
    return { message: 'Libra is busy right now. Please try again in a minute.', status: 503 }
  }
  return { message: 'Libra ran into a problem. Please try again.', status: 500 }
}
