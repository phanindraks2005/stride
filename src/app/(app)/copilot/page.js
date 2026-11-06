'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, Check, Dumbbell, Gauge, History, Plus, UtensilsCrossed, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTrackerColor, getQuickSteps } from '@/lib/trackerIcons'
import { useDemo } from '@/lib/useDemo'
import LibraGlyph from '@/components/LibraGlyph'
import Skeleton from '@/components/Skeleton'
import RichText from '@/components/libra/RichText'
import { MealPlan, WorkoutPlan } from '@/components/libra/PlanCards'
import styles from '@/components/libra/libra.module.css'

// A little longer than the server's own 50 s budget, so the server's message
// arrives first when Gemini is slow.
const LIBRA_TIMEOUT_MS = 60_000
const MAX_LENGTH = 2000

const LIBRA_MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  timeout: 'Libra is taking too long. Please try again in a minute.',
  broken: 'Something went wrong on our side. Please try again.',
  signedOut: 'Your session has ended. Log in again to talk to Libra.',
}

const TOOL_STATUS = {
  log_entry: 'Logging that',
  create_tracker: 'Making the tracker',
  generate_meal_plan: 'Planning meals',
  generate_workout_plan: 'Building a workout',
}

class LibraError extends Error {}

function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(key) {
  const today = dayKey(new Date())
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (key === today) return 'Today'
  if (key === dayKey(y)) return 'Yesterday'
  const [yr, m, d] = key.split('-').map(Number)
  return new Date(yr, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function findTracker(trackers, word) {
  return trackers.find((t) => t.name.toLowerCase().includes(word))
}

function suggestionsFor(trackers) {
  const first = trackers[0]
  const list = [
    { text: 'How am I doing today?', icon: Gauge, hue: 'var(--volt)' },
    first && {
      text: `Log ${getQuickSteps(first.unit)[1].toLocaleString('en-US')} ${first.unit} of ${first.name.toLowerCase()}`,
      icon: Plus,
      hue: getTrackerColor(first),
    },
    { text: 'Plan a high-protein dinner', icon: UtensilsCrossed, hue: getTrackerColor(findTracker(trackers, 'protein') || 'protein') },
    { text: 'Give me a 20-minute workout', icon: Dumbbell, hue: getTrackerColor(findTracker(trackers, 'workout') || 'workout') },
  ]
  return list.filter(Boolean)
}

// Reads the route's newline-delimited JSON events as they arrive
async function* readEvents(res) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) yield JSON.parse(line)
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer)
}

function ActionChips({ actions, trackers }) {
  const { href } = useDemo()
  return (
    <ul className={styles.chips} aria-label="What Libra did">
      {actions.map((a, i) => {
        const tracker = trackers.find((t) => t.name.toLowerCase() === a.tracker.toLowerCase())
        const hue = a.color || getTrackerColor(tracker || a.tracker)
        const value = typeof a.value === 'number' ? a.value.toLocaleString('en-US') : a.value
        const label = !a.success
          ? `Couldn't ${a.kind === 'create' ? 'create' : 'log'} ${a.tracker || 'that'}`
          : a.kind === 'create'
            ? `New tracker · ${a.tracker}${value ? `, ${value} ${a.unit} a day` : ''}`
            : `+${value} ${a.unit} ${a.tracker}`
        return (
          <li key={i} style={{ '--hue': a.success ? hue : 'var(--danger)', animationDelay: `${i * 90}ms` }}>
            <Link href={href('/dashboard')} className={styles.chip} data-failed={!a.success || undefined}>
              {a.success ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <X size={14} strokeWidth={3} aria-hidden="true" />}
              <span>{label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Message({ msg, trackers, onLog }) {
  if (msg.role === 'user') {
    return (
      <div className={styles.userRow}>
        <p className={styles.userBubble}>{msg.text}</p>
      </div>
    )
  }
  const art = msg.artifact
  const planKey = msg.id || msg.created_at
  return (
    <div className={styles.libraRow} data-error={msg.error || undefined}>
      <LibraGlyph size={18} badge state={msg.streaming ? 'thinking' : 'idle'} />
      <div className={styles.libraBody}>
        {msg.text ? (
          <div className={styles.libraText}>
            <RichText text={msg.text} tail={msg.streaming ? <span className={styles.caret} aria-hidden="true" /> : null} />
          </div>
        ) : msg.streaming ? (
          <p className={styles.thinking}><span>{msg.status || 'Thinking'}</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></p>
        ) : null}
        {art?.actions?.length > 0 && <ActionChips actions={art.actions} trackers={trackers} />}
        {art?.type === 'workout_plan' && (
          <WorkoutPlan plan={art} planKey={planKey} workoutTracker={findTracker(trackers, 'workout')} onLog={onLog} />
        )}
        {art?.type === 'meal_plan' && (
          <MealPlan plan={art} planKey={planKey} proteinTracker={findTracker(trackers, 'protein')} caloriesTracker={findTracker(trackers, 'calor')} onLog={onLog} />
        )}
      </div>
    </div>
  )
}

function HistoryList({ days, active, onPick }) {
  if (days.length === 0) return <p className={styles.historyEmpty}>Your conversations with Libra show up here, by day.</p>
  return (
    <ul className={styles.historyList}>
      {days.map((d) => (
        <li key={d.key}>
          <button type="button" className={styles.historyItem} data-active={active === d.key || undefined} onClick={() => onPick(d.key)}>
            <span className={styles.historyDay}>{dayLabel(d.key)}<span className="faint tnum">{d.count}</span></span>
            <span className={styles.historyFirst}>{d.first}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Copilot() {
  const router = useRouter()
  const { isDemo } = useDemo()
  const [messages, setMessages] = useState([])
  const [trackers, setTrackers] = useState([])
  const [status, setStatus] = useState('loading')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [glyph, setGlyph] = useState('idle')
  const [activeDay, setActiveDay] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const drawerRef = useRef(null)
  const pinned = useRef(true)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    const uid = session.user.id
    const [msgRes, trackerRes] = await Promise.all([
      supabase.from('messages').select('id, role, content, artifact, created_at').eq('user_id', uid).order('created_at', { ascending: true }),
      supabase.from('trackers').select('*').eq('user_id', uid).order('id'),
    ])
    if (msgRes.error || trackerRes.error) {
      setStatus('error')
      return
    }
    setMessages(msgRes.data.map((m) => ({ id: m.id, role: m.role, text: m.content, artifact: m.artifact, created_at: m.created_at })))
    setTrackers(trackerRes.data)
    setStatus('ready')
  }, [router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Follow the reply as it streams, unless the reader has scrolled up
  useEffect(() => {
    const el = threadRef.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [messages, status])

  function onScroll() {
    const el = threadRef.current
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [input])

  useEffect(() => {
    if (historyOpen) drawerRef.current?.showModal()
  }, [historyOpen])

  const days = useMemo(() => {
    const map = new Map()
    messages.forEach((m) => {
      if (!m.created_at) return
      const key = dayKey(m.created_at)
      if (!map.has(key)) map.set(key, { key, count: 0, first: '' })
      const d = map.get(key)
      d.count++
      if (!d.first && m.role === 'user') d.first = m.text
    })
    return [...map.values()].reverse().map((d) => ({ ...d, first: d.first || 'Libra' }))
  }, [messages])

  function patchLast(patch) {
    setMessages((prev) => {
      const next = prev.slice()
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, ...(typeof patch === 'function' ? patch(last) : patch) }
      return next
    })
  }

  async function logTo(tracker, value) {
    if (isDemo) return { error: 'This is a sample account, so nothing is logged. Sign up to log from Libra.' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: LIBRA_MESSAGES.signedOut }
    const { error } = await supabase.from('logs').insert({ user_id: session.user.id, tracker_id: tracker.id, value, logged_at: new Date().toISOString() })
    if (error) return { error: "Couldn't log that. Check your connection and try again." }
  }

  async function send(textArg) {
    const text = (textArg ?? input).trim()
    if (!text || sending || isDemo) return
    if (text.length > MAX_LENGTH) return
    const now = new Date().toISOString()
    pinned.current = true
    setMessages((prev) => [...prev, { role: 'user', text, created_at: now }, { role: 'assistant', text: '', streaming: true, created_at: now }])
    setInput('')
    setSending(true)
    setGlyph('thinking')

    try {
      const done = await askLibra(text)
      const artifact = done.actions?.length ? { ...(done.artifact || { type: 'actions' }), actions: done.actions } : done.artifact || null
      const { data: { session } } = await supabase.auth.getSession()
      const { data: saved } = await supabase.from('messages').insert({
        user_id: session.user.id,
        role: 'assistant',
        content: done.reply,
        artifact,
      }).select('id').single()
      patchLast({ text: done.reply, artifact, streaming: false, status: null, id: saved?.id })
      // Something was logged or created: refresh the colours and names
      if (done.actions?.some((a) => a.success)) {
        const { data } = await supabase.from('trackers').select('*').eq('user_id', session.user.id).order('id')
        if (data) setTrackers(data)
      }
      setGlyph('reply')
    } catch (err) {
      // Shown in the chat but not saved, so errors don't become part of the history.
      const message = err instanceof LibraError ? err.message : LIBRA_MESSAGES.broken
      patchLast({ text: message, error: true, streaming: false, status: null })
      setGlyph('idle')
    } finally {
      setSending(false)
      setTimeout(() => setGlyph((g) => (g === 'reply' ? 'idle' : g)), 1500)
    }
  }

  async function askLibra(message) {
    if (!navigator.onLine) throw new LibraError(LIBRA_MESSAGES.offline)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new LibraError(LIBRA_MESSAGES.signedOut)

    await supabase.from('messages').insert({ user_id: session.user.id, role: 'user', content: message })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LIBRA_TIMEOUT_MS)
    try {
      let res
      try {
        res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        })
      } catch {
        throw new LibraError(controller.signal.aborted ? LIBRA_MESSAGES.timeout : navigator.onLine ? LIBRA_MESSAGES.broken : LIBRA_MESSAGES.offline)
      }

      if (res.status === 401) throw new LibraError(LIBRA_MESSAGES.signedOut)
      // Refusals before the stream starts (empty or too long) come back as JSON
      if (!(res.headers.get('content-type') || '').includes('ndjson')) {
        const data = await res.json().catch(() => null)
        throw new LibraError(typeof data?.error === 'string' ? data.error : LIBRA_MESSAGES.broken)
      }

      try {
        for await (const event of readEvents(res)) {
          if (event.type === 'delta') patchLast((m) => ({ text: m.text + event.text, status: null }))
          else if (event.type === 'reset') patchLast({ text: '' })
          else if (event.type === 'tools') patchLast({ status: TOOL_STATUS[event.names[0]] || 'Working on it' })
          else if (event.type === 'error') throw new LibraError(event.error)
          else if (event.type === 'done') {
            if (!event.reply) throw new LibraError(LIBRA_MESSAGES.broken)
            return event
          }
        }
      } catch (err) {
        if (err instanceof LibraError) throw err
        throw new LibraError(controller.signal.aborted ? LIBRA_MESSAGES.timeout : LIBRA_MESSAGES.broken)
      }
      throw new LibraError(LIBRA_MESSAGES.broken)
    } finally {
      clearTimeout(timer)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  function jumpTo(key) {
    setActiveDay(key)
    setHistoryOpen(false)
    drawerRef.current?.close()
    const el = document.getElementById(`day-${key}`)
    if (!el) return
    pinned.current = false
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const suggestions = suggestionsFor(trackers)
  const last = messages[messages.length - 1]
  const headerStatus = sending
    ? last?.status ? `${last.status}…` : last?.text ? 'Writing…' : 'Thinking…'
    : trackers.length
      ? `Knows your ${trackers.length} trackers, notes and workouts`
      : 'Your Stride copilot'
  const tooLong = input.length > MAX_LENGTH

  // Group the thread by day, with a divider for each
  const thread = []
  let lastKey = null
  messages.forEach((m, i) => {
    const key = m.created_at ? dayKey(m.created_at) : lastKey
    if (key !== lastKey) {
      thread.push(<h2 key={`d-${key}`} id={`day-${key}`} className={styles.divider}><span>{dayLabel(key)}</span></h2>)
      lastKey = key
    }
    thread.push(<Message key={m.id || `m-${i}`} msg={m} trackers={trackers} onLog={logTo} />)
  })

  return (
    <div className={styles.page}>
      <aside className={styles.rail} aria-label="Chat history">
        <h2 className={styles.railTitle}>History</h2>
        {status === 'ready' ? <HistoryList days={days} active={activeDay} onPick={jumpTo} /> : (
          <div className={styles.historyList}>{[0, 1, 2].map((i) => <Skeleton key={i} height="52px" radius="10px" />)}</div>
        )}
      </aside>

      <section className={styles.chat} aria-labelledby="libra-title">
        <header className={`feature ${styles.header}`} style={{ '--g1': 'var(--volt)', '--g2': 'var(--t-move)' }}>
          <LibraGlyph size={34} draw state={glyph} inherit />
          <div className={styles.headText}>
            <h1 id="libra-title" className={styles.title}>Libra</h1>
            <p className={styles.status} aria-live="polite">{headerStatus}</p>
          </div>
          <button type="button" className={`icon-btn ${styles.historyBtn}`} onClick={() => setHistoryOpen(true)} aria-label="Chat history">
            <History size={20} aria-hidden="true" />
          </button>
        </header>

        <div ref={threadRef} className={styles.thread} onScroll={onScroll}>
          <div className={styles.threadInner}>
            {status === 'loading' && (
              <div className={styles.loading} aria-busy="true" aria-label="Loading your conversation">
                <Skeleton width="55%" height="44px" radius="16px" style={{ alignSelf: 'flex-end' }} />
                <Skeleton width="80%" height="88px" radius="16px" />
                <Skeleton width="40%" height="44px" radius="16px" style={{ alignSelf: 'flex-end' }} />
              </div>
            )}

            {status === 'error' && (
              <div className={styles.empty} role="alert">
                <LibraGlyph size={44} />
                <h2 className={styles.emptyTitle}>Couldn&apos;t load your chat</h2>
                <p className="muted">Nothing is lost. This is usually the connection.</p>
                <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
              </div>
            )}

            {status === 'ready' && messages.length === 0 && (
              <div className={styles.empty}>
                <LibraGlyph size={56} draw className={styles.emptyGlyph} />
                <h2 className={styles.emptyTitle}>Ask Libra about your day.</h2>
                <p className="muted">Libra can log for you, make trackers, and plan meals and workouts around what you&apos;ve already done today.</p>
                <ul className={styles.prompts}>
                  {suggestions.map((s, i) => (
                    <li key={s.text} style={{ '--hue': s.hue, animationDelay: `${300 + i * 80}ms` }}>
                      <button type="button" className={styles.prompt} onClick={() => send(s.text)}>
                        <span className={styles.promptIcon}><s.icon size={17} aria-hidden="true" /></span>
                        {s.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status === 'ready' && thread}
          </div>
        </div>

        {isDemo ? (
          <div className={styles.composer}>
            <p className={styles.demoNote}>
              <span>A recorded conversation on the sample account. Sign up to ask Libra about your own day.</span>
              <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </p>
          </div>
        ) : (
        <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); send() }}>
          {status === 'ready' && messages.length > 0 && !sending && (
            <div className={styles.quickPrompts}>
              {suggestions.map((s) => (
                <button key={s.text} type="button" className={styles.quickPrompt} style={{ '--hue': s.hue }} onClick={() => send(s.text)}>{s.text}</button>
              ))}
            </div>
          )}
          <div className={styles.inputWrap} data-invalid={tooLong || undefined}>
            <label htmlFor="libra-input" className="sr-only">Message Libra</label>
            <textarea
              id="libra-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              name="message"
              autoComplete="off"
              placeholder="Ask Libra anything…"
              disabled={status !== 'ready'}
              aria-describedby={input.length > MAX_LENGTH - 200 ? 'libra-count' : undefined}
            />
            <button type="submit" className={styles.send} disabled={!input.trim() || sending || tooLong} aria-label="Send">
              <ArrowUp size={20} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
          {input.length > MAX_LENGTH - 200 && (
            <p id="libra-count" className={styles.count} data-invalid={tooLong || undefined}>
              <span className="tnum">{input.length.toLocaleString('en-US')} / {MAX_LENGTH.toLocaleString('en-US')}</span>
              {tooLong && ' · too long to send'}
            </p>
          )}
        </form>
        )}
      </section>

      {historyOpen && (
        <dialog ref={drawerRef} className={styles.drawer} aria-label="Chat history" onClose={() => setHistoryOpen(false)} onClick={(e) => { if (e.target === drawerRef.current) drawerRef.current.close() }}>
          <div className={styles.drawerInner}>
            <header className={styles.drawerHead}>
              <h2 className={styles.railTitle}>History</h2>
              <button type="button" className="icon-btn" onClick={() => drawerRef.current.close()} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <HistoryList days={days} active={activeDay} onPick={jumpTo} />
          </div>
        </dialog>
      )}
    </div>
  )
}
