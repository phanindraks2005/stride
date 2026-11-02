'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function Copilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setMessages(data.map((m) => ({ role: m.role, text: m.content, artifact: m.artifact })))
    } else {
      setMessages([{ role: 'assistant', text: "Hey, I'm Libra — your Stride copilot. Ask me anything about your progress, or tell me to log something for you." }])
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setInput('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('messages').insert({
      user_id: user.id,
      role: 'user',
      content: userMessage,
    })

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ message: userMessage }),
    })
    const data = await res.json()

    const replyText = data.reply || data.error || 'Something went wrong.'

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: replyText, artifact: data.artifact },
    ])

    await supabase.from('messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: replyText,
      artifact: data.artifact || null,
    })

    setLoading(false)
  }

  function sendSuggestion(text) {
    setInput(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: '80px 0 0 0', overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="copilot-blob copilot-blob-1" />
        <div className="copilot-blob copilot-blob-2" />
        <div className="copilot-blob copilot-blob-3" />
      </div>
        <div className="page-enter" style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div className="libra-avatar" style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--violet), var(--coral))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '16px', color: '#fff',
          }}>
            L
          </div>
          <div>
            <h2 style={{ fontSize: '18px' }}>Libra</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-low)' }}>Your Stride copilot</p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {['How am I doing today?', 'Log 500ml of water', 'Give me a quick workout', 'What should I eat?'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendSuggestion(suggestion)}
                  style={{
                    background: 'var(--card)', border: '1px solid var(--card-border)',
                    color: 'var(--text-mid)', padding: '8px 14px', borderRadius: '100px',
                    fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="message-enter" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div
                style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'var(--card)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  fontSize: '14.5px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-hi)',
                }}
              >
                {msg.text}
              </div>

              {msg.artifact?.type === 'meal_plan' && (
                <div className="glass-card" style={{ marginTop: '10px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{msg.artifact.title}</h3>
                  {msg.artifact.meals.map((meal, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderTop: idx > 0 ? '1px solid var(--card-border)' : 'none',
                        fontSize: '13.5px',
                      }}
                    >
                      <span>{meal.name}</span>
                      <span style={{ color: 'var(--teal)' }}>
                        {meal.protein_g ? `${meal.protein_g}g protein` : ''}
                        {meal.calories ? ` · ${meal.calories} kcal` : ''}
                      </span>
                    </div>
                  ))}
                  {msg.artifact.note && (
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-mid)' }}>
                      {msg.artifact.note}
                    </p>
                  )}
                </div>
              )}

              {msg.artifact?.type === 'workout_plan' && (
                <div className="glass-card" style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px' }}>{msg.artifact.title}</h3>
                    {msg.artifact.duration_mins && (
                      <span style={{ fontSize: '12px', color: 'var(--text-low)' }}>~{msg.artifact.duration_mins} min</span>
                    )}
                  </div>
                  {msg.artifact.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderTop: idx > 0 ? '1px solid var(--card-border)' : 'none',
                        fontSize: '13.5px',
                      }}
                    >
                      <span>{ex.name}</span>
                      <span style={{ color: 'var(--violet)' }}>
                        {ex.sets ? `${ex.sets} sets` : ''}
                        {ex.reps ? ` × ${ex.reps}` : ''}
                      </span>
                    </div>
                  ))}
                  {msg.artifact.note && (
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-mid)' }}>
                      {msg.artifact.note}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '5px', padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '16px' }}>
              <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--violet)', display: 'inline-block' }} />
              <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--coral)', display: 'inline-block' }} />
              <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
          <input
            className="log-input"
            style={{ flex: 1, width: 'auto' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Libra anything..."
          />
          <button className="log-btn" onClick={sendMessage} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </>
  )
}