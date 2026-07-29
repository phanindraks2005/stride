'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import { Trash2, Plus } from 'lucide-react'
import { useRef } from 'react'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const saveTimeout = useRef(null)

  useEffect(() => {
    if (!title.trim() && !content.trim()) return

    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    saveTimeout.current = setTimeout(() => {
      autoSave()
    }, 1000)

    return () => clearTimeout(saveTimeout.current)
  }, [title, content])

  async function autoSave() {
    if (!title.trim() && !content.trim()) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (selectedNote) {
      await supabase
        .from('notes')
        .update({ title: title.trim() || 'Untitled', content: content.trim() })
        .eq('id', selectedNote.id)
    } else {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({ user_id: user.id, title: title.trim() || 'Untitled', content: content.trim() })
        .select()
        .single()
      setSelectedNote(newNote)
    }

    setSaving(false)
    loadNotes()
  }

  useEffect(() => {
    loadNotes()
  }, [])

  async function loadNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setNotes(data || [])
    setLoading(false)
  }

  function startNewNote() {
    setSelectedNote(null)
    setTitle('')
    setContent('')
  }

  function openNote(note) {
    setSelectedNote(note)
    setTitle(note.title || '')
    setContent(note.content || '')
  }

  async function handleDeleteNote(noteId) {
    await supabase.from('notes').delete().eq('id', noteId)
    if (selectedNote?.id === noteId) startNewNote()
    loadNotes()
  }

  if (loading) return (
    <>
      <div style={{ padding: '40px', color: 'var(--text-mid)' }}>Loading...</div>
    </>
  )

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <div className="copilot-blob copilot-blob-1" />
        <div className="copilot-blob copilot-blob-2" />
        <div className="copilot-blob copilot-blob-3" />

        <div className="page-enter" style={{ position: 'relative', zIndex: 2, maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Journal
            </p>
            <h1 style={{ fontSize: '36px' }}>
              Your <span className="gradient-text">notes</span>
            </h1>
          </div>
          <button
            onClick={startNewNote}
            className="log-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New note
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left: list of titles */}
          <div style={{ display: 'grid', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {notes.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-low)' }}>No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openNote(note)}
                  className="glass-card"
                  style={{
                    padding: '14px 16px', cursor: 'pointer',
                    border: selectedNote?.id === note.id ? '1px solid var(--violet)' : '1px solid var(--card-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.title || 'Untitled'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-low)' }}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Right: full note editor/viewer */}
          <div className="glass-card" style={{ minHeight: '500px' }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                fontSize: '22px', fontFamily: 'Fraunces, serif', color: 'var(--text-hi)',
                marginBottom: '16px', outline: 'none',
              }}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              rows={16}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                fontSize: '14px', lineHeight: '1.6', color: 'var(--text-mid)',
                fontFamily: 'Space Grotesk, sans-serif', resize: 'vertical', outline: 'none',
                marginBottom: '16px',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-low)' }}>
              {saving ? 'Saving...' : selectedNote ? 'Saved' : 'Start typing to save'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}