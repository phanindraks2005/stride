'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, NotebookPen, Plus, Search, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDemo } from '@/lib/useDemo'
import EmptyState from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import styles from './notes.module.css'

const SAVE_DELAY = 800

// Each note keeps one colour, picked from its id, for its stripe and editor card
const NOTE_HUES = ['#ffb547', '#ff9a3d', '#ff7ad9', '#c792ff', '#2fd6c3', '#3fc6f2']
function noteHue(note) {
  return note?.id ? NOTE_HUES[Number(note.id) % NOTE_HUES.length] : NOTE_HUES[0]
}

function when(iso) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function snippet(text) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 120)
}

// Wraps the part of `text` that matches the search in <mark>
function Highlight({ text, query }) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>
}

function SaveState({ state, onRetry }) {
  if (state === 'error') {
    return (
      <span className={styles.save} data-state="error" role="alert">
        Couldn&apos;t save<button type="button" onClick={onRetry}>Retry</button>
      </span>
    )
  }
  return (
    <span className={styles.save} data-state={state} aria-live="polite">
      {state === 'saved' && <><Check size={14} strokeWidth={3} aria-hidden="true" />Saved</>}
      {(state === 'pending' || state === 'saving') && <><i aria-hidden="true" />Saving</>}
    </span>
  )
}

// The open note lives in the URL, so it can be linked to and survives a reload
function noteUrl(id) {
  window.history.replaceState(null, '', id ? `?id=${id}` : window.location.pathname)
}

export default function Notes() {
  const router = useRouter()
  const [status, setStatus] = useState('loading')
  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '' })
  const [saveState, setSaveState] = useState('idle')
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [draftKey, setDraftKey] = useState(0)
  const { isDemo } = useDemo()

  const userRef = useRef(null)
  // The open draft: { id } where id is null until its first save inserts it.
  // Queued saves hold the token, so they all land on the same row.
  const activeRef = useRef({ id: null })
  const draftRef = useRef(draft)
  const dirty = useRef(false)
  const timer = useRef(null)
  const queue = useRef(Promise.resolve())
  const titleRef = useRef(null)
  const bodyRef = useRef(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
    userRef.current = session.user.id
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    if (error) return setStatus('error')
    setNotes(data)
    setStatus('ready')
  }, [router])

  // load() only sets state after its first await
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // ?id= opens that note (the calendar links to notes this way)
  const linked = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || linked.current) return
    linked.current = true
    const id = new URLSearchParams(window.location.search).get('id')
    const note = id && notes.find((n) => String(n.id) === id)
    if (note) open(note)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Saves run one after another, so a new note is inserted once and every later
  // edit updates that row, however fast the typing or switching.
  const persist = useCallback(() => {
    clearTimeout(timer.current)
    if (!dirty.current) return queue.current
    dirty.current = false
    const snapshot = { ...draftRef.current }
    const token = activeRef.current
    queue.current = queue.current.then(async () => {
      const values = { title: snapshot.title.trim() || 'Untitled', content: snapshot.content }
      const id = token.id
      if (id === null && !snapshot.title.trim() && !snapshot.content.trim()) {
        setSaveState('idle')
        return
      }
      setSaveState('saving')
      if (id === null) {
        const { data, error } = await supabase.from('notes').insert({ user_id: userRef.current, ...values }).select().single()
        if (error) {
          if (activeRef.current === token) dirty.current = true
          setSaveState('error')
          return
        }
        token.id = data.id
        if (activeRef.current === token) setActiveId(data.id)
        setNotes((prev) => [data, ...prev])
      } else {
        const { error } = await supabase.from('notes').update(values).eq('id', id)
        if (error) {
          if (activeRef.current === token) dirty.current = true
          setSaveState('error')
          return
        }
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...values } : n)))
      }
      setSaveState(dirty.current ? 'pending' : 'saved')
    })
    return queue.current
  }, [])

  function edit(field, value) {
    const next = { ...draftRef.current, [field]: value }
    draftRef.current = next
    setDraft(next)
    dirty.current = true
    setSaveState('pending')
    clearTimeout(timer.current)
    timer.current = setTimeout(persist, SAVE_DELAY)
  }

  // Don't lose a pending save when the tab closes
  useEffect(() => {
    function onLeave(e) {
      if (dirty.current || saveState === 'saving') {
        persist()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [persist, saveState])

  // Flush when leaving the page inside the app, too
  useEffect(() => () => { persist() }, [persist])

  // The body grows with its text
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 240)}px`
  }, [draft.content, activeId, editing])

  // persist() takes its snapshot straight away, so switching never waits on the network
  function open(note) {
    noteUrl(note?.id)
    persist()
    activeRef.current = { id: note ? note.id : null }
    const next = note ? { title: note.title === 'Untitled' ? '' : note.title || '', content: note.content || '' } : { title: '', content: '' }
    draftRef.current = next
    setDraft(next)
    setActiveId(activeRef.current.id)
    setDraftKey((k) => k + 1)
    setSaveState(note ? 'saved' : 'idle')
    setConfirming(false)
    setDeleteError('')
    setEditing(true)
    if (!note) setTimeout(() => titleRef.current?.focus())
  }

  function back() {
    noteUrl(null)
    persist()
    setEditing(false)
  }

  async function remove() {
    clearTimeout(timer.current)
    dirty.current = false
    await queue.current
    const id = activeRef.current.id
    if (id !== null) {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) return setDeleteError("Couldn't delete the note. Try again.")
      setNotes((prev) => prev.filter((n) => n.id !== id))
    }
    noteUrl(null)
    activeRef.current = { id: null }
    draftRef.current = { title: '', content: '' }
    setDraft(draftRef.current)
    setActiveId(null)
    setConfirming(false)
    setSaveState('idle')
    setEditing(false)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(q))
  }, [notes, query])

  if (status === 'loading') {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Loading notes">
        <div className={styles.list}>
          <Skeleton height="44px" radius="12px" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="76px" radius="12px" />)}
        </div>
        <div className={styles.editorPane}><Skeleton width="50%" height="40px" /><Skeleton height="200px" radius="12px" /></div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.page} data-single>
        <div className={`surface ${styles.message}`} role="alert">
          <h1 className={styles.messageTitle}>Couldn&apos;t load your notes</h1>
          <p className="muted">Nothing is lost. This is usually the connection.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setStatus('loading'); load() }}>Try again</button>
        </div>
      </div>
    )
  }

  const active = notes.find((n) => n.id === activeId)
  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0
  const showEditor = editing || activeId !== null

  return (
    <div className={styles.page} data-editing={editing || undefined}>
      <aside className={styles.list} aria-label="Notes">
        <div className={`feature ${styles.listHead}`} style={{ '--g1': '#ffcf5c', '--g2': 'var(--t-protein)' }}>
          <div>
            <h1 className={styles.title}>Notes</h1>
            <p className={styles.headMeta}>
              {notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} · last ${when(notes[0].created_at)}` : 'Nothing written yet'}
            </p>
          </div>
          {!isDemo && <button type="button" className="btn btn-ink btn-sm" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />New note</button>}
        </div>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <label htmlFor="note-search" className="sr-only">Search notes</label>
          <input id="note-search" name="q" type="search" autoComplete="off" placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Clear search"><X size={14} aria-hidden="true" /></button>}
        </div>

        {notes.length === 0 ? (
          <div className={styles.listEmpty}>
            <p>No notes yet. Your first one shows up here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className={styles.listEmpty}>No notes match “{query.trim()}”.</p>
        ) : (
          <ul className={styles.items}>
            {filtered.map((n, i) => {
              const live = n.id === activeId
              const title = live ? draft.title.trim() || 'Untitled' : n.title || 'Untitled'
              const body = live ? draft.content : n.content
              return (
                <li key={n.id} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                  <button type="button" className={styles.item} style={{ '--hue': noteHue(n) }} aria-current={live || undefined} onClick={() => open(n)}>
                    <span className={styles.itemTop}>
                      <span className={styles.itemTitle}><Highlight text={title} query={query.trim()} /></span>
                      <span className={styles.itemDate}>{when(n.created_at)}</span>
                    </span>
                    <span className={styles.itemBody}>{snippet(body) ? <Highlight text={snippet(body)} query={query.trim()} /> : <span className="faint">No text</span>}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className={styles.editorPane} aria-label="Editor">
        {showEditor ? (
          <div key={draftKey} className={styles.editor} style={{ '--hue': noteHue(active) }}>
            <div className={styles.toolbar}>
              <button type="button" className={styles.back} onClick={back}><ChevronLeft size={18} aria-hidden="true" />Notes</button>
              <span className={styles.meta}><span className={styles.created}>{active ? `Created ${when(active.created_at)}` : 'New note'}</span><span className={`${styles.words} tnum`}>{words} {words === 1 ? 'word' : 'words'}</span></span>
              {isDemo ? <span className={styles.readOnly}>Read only</span> : (
                <>
                  <SaveState state={saveState} onRetry={() => { dirty.current = true; persist() }} />
                  <button type="button" className="icon-btn" onClick={() => setConfirming(true)} aria-label="Delete note"><Trash2 size={17} aria-hidden="true" /></button>
                </>
              )}
            </div>
            {confirming && (
              <div className={styles.confirm} role="alert">
                <p>Delete {draft.title.trim() ? <b>{draft.title.trim()}</b> : 'this note'}? This can&apos;t be undone.</p>
                {deleteError && <p className="error-text">{deleteError}</p>}
                <div className={styles.confirmActions}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={remove} autoFocus><Trash2 size={15} aria-hidden="true" />Delete</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep it</button>
                </div>
              </div>
            )}
            <label htmlFor="note-title" className="sr-only">Title</label>
            <input
              id="note-title"
              ref={titleRef}
              className={styles.titleInput}
              name="title"
              autoComplete="off"
              placeholder="Title"
              maxLength={120}
              readOnly={isDemo}
              value={draft.title}
              onChange={(e) => edit('title', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); bodyRef.current?.focus() } }}
            />
            <label htmlFor="note-body" className="sr-only">Note</label>
            <textarea
              id="note-body"
              ref={bodyRef}
              className={styles.body}
              name="content"
              placeholder="Start writing…"
              readOnly={isDemo}
              value={draft.content}
              onChange={(e) => edit('content', e.target.value)}
            />
          </div>
        ) : (
          notes.length === 0 && !isDemo ? (
            <div className={styles.emptyWrap}>
              <EmptyState
                id="notes-empty"
                icon={<NotebookPen size={24} />}
                title="Your first note"
                hues={['var(--a-amber)', 'var(--t-protein)']}
                art={(
                  <div className={styles.emptyArt}>
                    <span><b>Push day</b><i /><i /><i data-short /></span>
                    <span><b>Sleep experiment</b><i /><i data-short /></span>
                  </div>
                )}
                action={<button type="button" className="btn btn-primary btn-lg" onClick={() => open(null)}><Plus size={18} aria-hidden="true" />Write a note</button>}
              >
                <p>Write down what the numbers miss: how a session felt, what you ate, why sleep was bad. Notes save as you type, and Libra reads your five most recent.</p>
              </EmptyState>
            </div>
          ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><NotebookPen size={24} aria-hidden="true" /></span>
            <h2 className={styles.emptyTitle}>{isDemo ? 'Pick a note to read it' : 'Pick a note, or start a new one'}</h2>
            <p className="muted">Notes save as you type. Libra reads your five most recent when you ask it something.</p>
            {!isDemo && <button type="button" className="btn btn-primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />New note</button>}
          </div>
          )
        )}
      </section>
    </div>
  )
}
