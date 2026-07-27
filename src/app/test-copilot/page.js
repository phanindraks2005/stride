'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestCopilot() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId: user.id }),
    })
    const data = await res.json()
    setReply(data.reply || data.error)
    setLoading(false)
  }

  return (
    <div style={{ padding: '40px', color: 'white' }}>
      <h1>Copilot Test</h1>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask something..."
        style={{ padding: '10px', width: '300px', marginRight: '10px' }}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
      <p style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>{reply}</p>
    </div>
  )
}