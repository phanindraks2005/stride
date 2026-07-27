'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import { Dumbbell, Trash2 } from 'lucide-react'
import { useState as useState2 } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar as CalendarIcon, ChevronLeft } from 'lucide-react'
import { useRef } from 'react'
import { getMuscleIconComponent } from '@/lib/trackerIcons'

export default function Workouts() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const router = useRouter()
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [daySummary, setDaySummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const hasSeeded = useRef(false)
  const [showDailyPrompt, setShowDailyPrompt] = useState(false)
  const [selectedToday, setSelectedToday] = useState([])
  const [profileName, setProfileName] = useState('')
  const [todaysMuscleIds, setTodaysMuscleIds] = useState(null)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    let { data } = await supabase
      .from('muscle_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    if ((!data || data.length === 0) && !hasSeeded.current) {
      hasSeeded.current = true
      await seedDefaults(user.id)
      const { data: freshData } = await supabase
        .from('muscle_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
      data = freshData
    }

    setGroups(data || [])
    setLoading(false)
    checkDailySelection(user.id)
  }

  async function checkDailySelection(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single()

    if (profile?.name) setProfileName(profile.name)

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const { data: existing } = await supabase
      .from('daily_selections')
      .select('muscle_group_id')
      .eq('user_id', userId)
      .eq('selected_date', dateStr)

    if (existing && existing.length > 0) {
      setTodaysMuscleIds(existing.map((e) => e.muscle_group_id))
    } else {
      setShowDailyPrompt(true)
    }
  }

  function toggleMuscleSelection(groupId) {
    setSelectedToday((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

async function confirmDailySelection() {
    if (selectedToday.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    await supabase
      .from('daily_selections')
      .delete()
      .eq('user_id', user.id)
      .eq('selected_date', dateStr)

    const rows = selectedToday.map((groupId) => ({
      user_id: user.id,
      muscle_group_id: groupId,
      selected_date: dateStr,
    }))

    await supabase.from('daily_selections').insert(rows)
    setTodaysMuscleIds(selectedToday)
    setShowDailyPrompt(false)
  }

  function skipDailyPrompt() {
    setShowDailyPrompt(false)
    setTodaysMuscleIds(null)
  }

  async function seedDefaults(userId) {
    const defaults = [
      { name: 'Chest', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Push-ups', 'Chest Fly'] },
      { name: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Bent Over Row', 'Lat Pulldown'] },
      { name: 'Biceps', exercises: ['Barbell Curl', 'Hammer Curl', 'Concentration Curl'] },
      { name: 'Triceps', exercises: ['Tricep Pushdown', 'Skull Crushers', 'Dips'] },
      { name: 'Legs', exercises: ['Squats', 'Lunges', 'Leg Press', 'Romanian Deadlift'] },
    ]

    for (const group of defaults) {
      const { data: newGroup } = await supabase
        .from('muscle_groups')
        .insert({ user_id: userId, name: group.name })
        .select()
        .single()

      if (newGroup) {
        const exerciseRows = group.exercises.map((name) => ({
          user_id: userId,
          muscle_group_id: newGroup.id,
          name,
        }))
        await supabase.from('exercises').insert(exerciseRows)
      }
    }
  }

  async function loadDaySummary(date) {
    setSummaryLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: dayLogs } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay.toISOString())
      .lt('logged_at', endOfDay.toISOString())

    if (!dayLogs || dayLogs.length === 0) {
      setDaySummary([])
      setSummaryLoading(false)
      return
    }

    const exerciseIds = [...new Set(dayLogs.map((l) => l.exercise_id))]
    const { data: exercisesData } = await supabase
      .from('exercises')
      .select('*')
      .in('id', exerciseIds)

    const groupIds = [...new Set(exercisesData.map((e) => e.muscle_group_id))]
    const { data: groupsData } = await supabase
      .from('muscle_groups')
      .select('*')
      .in('id', groupIds)

    const summary = groupsData.map((group) => {
      const groupExercises = exercisesData
        .filter((ex) => ex.muscle_group_id === group.id)
        .map((ex) => ({
          ...ex,
          logs: dayLogs.filter((l) => l.exercise_id === ex.id),
        }))
        .filter((ex) => ex.logs.length > 0)

      return { ...group, exercises: groupExercises }
    }).filter((g) => g.exercises.length > 0)

    setDaySummary(summary)
    setSummaryLoading(false)
  }

  async function handleAddGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('muscle_groups').insert({
      user_id: user.id,
      name: newGroupName.trim(),
    })

    if (!error) {
      setNewGroupName('')
      setShowAddForm(false)
      loadGroups()
    }
  }

  async function handleDeleteGroup(groupId) {
    const confirmed = window.confirm('Delete this muscle group and all its exercises?')
    if (!confirmed) return

    const { data: exercises } = await supabase
      .from('exercises')
      .select('id')
      .eq('muscle_group_id', groupId)

    const exerciseIds = exercises?.map((e) => e.id) || []

    if (exerciseIds.length > 0) {
      await supabase.from('exercise_logs').delete().in('exercise_id', exerciseIds)
      await supabase.from('exercises').delete().eq('muscle_group_id', groupId)
    }

    await supabase.from('muscle_groups').delete().eq('id', groupId)
    loadGroups()
  }

  if (loading) return (
    <>
      <div style={{ padding: '40px', color: 'var(--text-mid)' }}>Loading...</div>
    </>
  )

  if (showDailyPrompt) {
    const muscleOptions = [...new Set(groups.map((g) => g.name))]

    return (
      <>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', position: 'relative',
        }}>
          
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Today's session
            </p>
            <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>
              {profileName ? `Hey ${profileName}, what` : 'What'} are you training today?
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', marginBottom: '28px' }}>
              Pick one or more — you can always add more later.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleMuscleSelection(group.id)}
                  style={{
                    background: selectedToday.includes(group.id) ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'var(--card)',
                    border: selectedToday.includes(group.id) ? 'none' : '1px solid var(--card-border)',
                    color: selectedToday.includes(group.id) ? '#fff' : 'var(--text-mid)',
                    padding: '12px 22px', borderRadius: '100px', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  {group.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={confirmDailySelection}
                disabled={selectedToday.length === 0}
                className="log-btn"
                style={{ padding: '13px 40px', opacity: selectedToday.length === 0 ? 0.5 : 1 }}
              >
                Next
              </button>
              <button
                onClick={skipDailyPrompt}
                style={{
                  background: 'transparent', border: '1px solid var(--card-border)',
                  color: 'var(--text-mid)', borderRadius: '10px', padding: '13px 24px',
                  fontSize: '14px', cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <div className="copilot-blob copilot-blob-1" />
        <div className="copilot-blob copilot-blob-2" />
        <div className="copilot-blob copilot-blob-3" />

        <div className="page-enter" style={{ position: 'relative', zIndex: 2, maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              Strength training
            </p>
            <h1 style={{ fontSize: '36px' }}>
              Your <span className="gradient-text">workouts</span>
            </h1>
          </div>
          <button
            onClick={() => { setSelectedToday(todaysMuscleIds || []); setShowDailyPrompt(true) }}
            style={{
              background: 'var(--card)', border: '1px solid var(--card-border)',
              color: 'var(--text-mid)', borderRadius: '10px', padding: '9px 16px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            {todaysMuscleIds ? "Change today's focus" : "Pick today's focus"}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                background: 'var(--card)', border: '1px solid var(--card-border)',
                borderRadius: '10px', padding: '9px 14px', color: 'var(--text-mid)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
              }}
            >
              <CalendarIcon size={15} /> View by date
            </button>

            {showCalendar && (
              <div style={{
                position: 'absolute', top: '44px', right: 0, zIndex: 50,
                background: '#161620', border: '1px solid var(--card-border)',
                borderRadius: '14px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setShowCalendar(false)
                      loadDaySummary(date)
                    }
                  }}
                  disabled={{ after: new Date() }}
                />
              </div>
            )}
          </div>
        </div>

        {selectedDate && (
          <div style={{ marginBottom: '32px' }}>
            <button
              onClick={() => { setSelectedDate(null); setDaySummary(null) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--text-mid)', cursor: 'pointer', fontSize: '13px', marginBottom: '14px' }}
            >
              <ChevronLeft size={15} /> Back to all groups
            </button>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>

            {summaryLoading ? (
              <p style={{ color: 'var(--text-mid)', fontSize: '14px' }}>Loading...</p>
            ) : daySummary?.length === 0 ? (
              <p style={{ color: 'var(--text-low)', fontSize: '14px' }}>No workouts logged this day.</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {daySummary?.map((group) => (
                  <div key={group.id} className="glass-card">
                    <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--coral)' }}>{group.name}</h4>
                    {group.exercises.map((ex) => (
                      <div key={ex.id} style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '14px', marginBottom: '4px' }}>{ex.name}</p>
                        {ex.logs.map((log) => (
                          <p key={log.id} style={{ fontSize: '13px', color: 'var(--text-mid)', paddingLeft: '12px' }}>
                            {log.sets} × {log.reps} {log.weight ? `@ ${log.weight}kg` : ''}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
          {(todaysMuscleIds ? groups.filter((g) => todaysMuscleIds.includes(g.id)) : groups).map((group) => (
            <div key={group.id} className="glass-card" style={{ position: 'relative', padding: 0 }}>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                style={{
                  position: 'absolute', top: '10px', right: '10px', zIndex: 2,
                  background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
              <Link
                href={`/fitness/${group.id}`}
                style={{
                  textDecoration: 'none', color: 'inherit', display: 'block',
                  padding: '20px 16px', width: '100%', height: '100%',
                }}
              >
               {(() => {
                  const MuscleIcon = getMuscleIconComponent(group.name)
                  return <MuscleIcon size={22} color="var(--coral)" />
                })()}
                <p style={{ fontSize: '15px', fontWeight: 500 }}>{group.name}</p>
              </Link>
            </div>
          ))}
        </div>

        {todaysMuscleIds && (
          <button
            onClick={() => { setSelectedToday(todaysMuscleIds); setShowDailyPrompt(true) }}
            style={{
              background: 'transparent', border: '1px dashed var(--card-border)',
              color: 'var(--text-mid)', borderRadius: '10px', padding: '10px 18px',
              fontSize: '13px', cursor: 'pointer', marginTop: '16px', marginBottom: '4px',
            }}
          >
            + Add more for today
          </button>
        )}

        <div style={{ marginTop: '20px' }}>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', background: 'var(--card)', border: '1px dashed var(--card-border)',
                borderRadius: '14px', padding: '16px', color: 'var(--text-mid)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              + Add muscle group
            </button>
          ) : (
            <form onSubmit={handleAddGroup} className="glass-card" style={{ display: 'flex', gap: '10px' }}>
              <input
                className="log-input"
                style={{ flex: 1 }}
                placeholder="e.g. Chest, Back, Legs"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
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
    </div>
    </>
  )
}