'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import { ChevronLeft, Trash2 } from 'lucide-react'

export default function ExercisePage() {
  const [exercise, setExercise] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const router = useRouter()
  const params = useParams()
  const { groupId, exerciseId } = params
  const [historyFilter, setHistoryFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [exerciseId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: exerciseData } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .single()

    setExercise(exerciseData)

    const { data: logData } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('logged_at', { ascending: false })

    setLogs(logData || [])
    setLoading(false)
  }

  function getFilteredLogs() {
    if (historyFilter === 'all') return logs

    const now = new Date()
    const cutoff = new Date()

    if (historyFilter === 'week') cutoff.setDate(now.getDate() - 7)
    if (historyFilter === 'month') cutoff.setDate(now.getDate() - 30)

    return logs.filter((log) => new Date(log.logged_at) >= cutoff)
  }

  async function handleAddLog(e) {
    e.preventDefault()
    if (!sets || !reps) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('exercise_logs').insert({
      user_id: user.id,
      exercise_id: exerciseId,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : null,
      logged_at: new Date().toISOString(),
    })

    if (!error) {
      setSets('')
      setReps('')
      setWeight('')
      loadData()
    }
  }

  async function handleDeleteLog(logId) {
    await supabase.from('exercise_logs').delete().eq('id', logId)
    loadData()
  }

  if (loading) return (
    <>
      <div style={{ padding: '40px', color: 'var(--text-mid)' }}>Loading...</div>
    </>
  )

  return (
    <>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <Link href={`/fitness/${groupId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-mid)', textDecoration: 'none', fontSize: '13px', marginBottom: '20px' }}>
          <ChevronLeft size={16} /> Back
        </Link>

        <h1 style={{ fontSize: '32px', marginBottom: '28px' }}>
          <span className="gradient-text">{exercise?.name}</span>
        </h1>

        <form onSubmit={handleAddLog} className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px', color: 'var(--text-mid)' }}>Log a set</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <input
              className="log-input"
              style={{ flex: '1 1 80px' }}
              type="number"
              placeholder="Sets"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
            />
            <input
              className="log-input"
              style={{ flex: '1 1 80px' }}
              type="number"
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
            <input
              className="log-input"
              style={{ flex: '1 1 100px' }}
              type="number"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <button type="submit" className="log-btn" style={{ width: '100%' }}>Log set</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--text-mid)' }}>History</h3>
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
            style={{
              background: 'var(--card)', border: '1px solid var(--card-border)',
              color: 'var(--text-mid)', borderRadius: '8px', padding: '6px 10px',
              fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer',
            }}
          >
            <option value="all">All time</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {getFilteredLogs().length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--text-low)' }}>No sets logged yet.</p>
          ) : (
            getFilteredLogs().map((log) => (
              <div key={log.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                <div>
                  <p style={{ fontSize: '15px' }}>
                    {log.sets} × {log.reps} {log.weight ? `@ ${log.weight}kg` : ''}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-low)', marginTop: '2px' }}>
                    {new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}