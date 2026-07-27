'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import { ChevronLeft, Trash2 } from 'lucide-react'

export default function MuscleGroupPage() {
  const [group, setGroup] = useState(null)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId

  useEffect(() => {
    loadData()
  }, [groupId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: groupData } = await supabase
      .from('muscle_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    setGroup(groupData)

    const { data: exerciseData } = await supabase
      .from('exercises')
      .select('*')
      .eq('muscle_group_id', groupId)
      .order('created_at')

    setExercises(exerciseData || [])
    setLoading(false)
  }

  async function handleAddExercise(e) {
    e.preventDefault()
    if (!newExerciseName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('exercises').insert({
      user_id: user.id,
      muscle_group_id: groupId,
      name: newExerciseName.trim(),
    })

    if (!error) {
      setNewExerciseName('')
      setShowAddForm(false)
      loadData()
    }
  }

  async function handleDeleteExercise(exerciseId) {
    const confirmed = window.confirm('Delete this exercise and all its logged history?')
    if (!confirmed) return

    await supabase.from('exercise_logs').delete().eq('exercise_id', exerciseId)
    await supabase.from('exercises').delete().eq('id', exerciseId)
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
        <Link href="/fitness" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-mid)', textDecoration: 'none', fontSize: '13px', marginBottom: '20px' }}>
          <ChevronLeft size={16} /> Back to fitness
        </Link>

        <h1 style={{ fontSize: '36px', marginBottom: '32px' }}>
          <span className="gradient-text">{group?.name}</span>
        </h1>

        <div style={{ display: 'grid', gap: '12px' }}>
          {exercises.map((exercise) => (
            <div key={exercise.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
              <Link
                href={`/fitness/${groupId}/${exercise.id}`}
                style={{
                  textDecoration: 'none', color: 'inherit', flex: 1,
                  display: 'block', padding: '18px 24px',
                }}
              >
                <p style={{ fontSize: '16px' }}>{exercise.name}</p>
              </Link>
              <button
                onClick={() => handleDeleteExercise(exercise.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer', padding: '0 20px' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', background: 'var(--card)', border: '1px dashed var(--card-border)',
                borderRadius: '14px', padding: '16px', color: 'var(--text-mid)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              + Add exercise
            </button>
          ) : (
            <form onSubmit={handleAddExercise} className="glass-card" style={{ display: 'flex', gap: '10px' }}>
              <input
                className="log-input"
                style={{ flex: 1 }}
                placeholder="e.g. Bench Press"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="log-btn">Add</button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-mid)', borderRadius: '10px', padding: '0 16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}