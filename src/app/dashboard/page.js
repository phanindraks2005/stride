'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import { getTrackerIcon, getTrackerColor } from '@/lib/trackerIcons'
import WaveFill from '@/components/WaveFill'
import { ChevronDown, Pencil } from 'lucide-react'
import { calculateStreak } from '@/lib/streak'
import Skeleton from '@/components/Skeleton'
import ProductTour from '@/components/ProductTour'

function DashboardContent() {
  const [trackers, setTrackers] = useState([])
  const [todayLogs, setTodayLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [inputValues, setInputValues] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTracker, setNewTracker] = useState({ name: '', unit: '', target_value: '' })
  const [addLoading, setAddLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewDate = searchParams.get('date')
  const [expandedTracker, setExpandedTracker] = useState(null)
  const [dayLogs, setDayLogs] = useState({})
  const [streak, setStreak] = useState(0)
  const [editingTracker, setEditingTracker] = useState(null)
  const [editValues, setEditValues] = useState({ name: '', unit: '', target_value: '' })
  const [profileName, setProfileName] = useState('')
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    loadData()
  }, [viewDate])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: trackerData } = await supabase
      .from('trackers')
      .select('*')
      .eq('user_id', user.id)

    setTrackers(trackerData || [])
    const streakCount = await calculateStreak(user.id)
    setStreak(streakCount)

    const { data: profile } = await supabase

  .from('profiles')
  .select('name, has_seen_tour')
  .eq('user_id', user.id)
  .single()

    if (profile?.name) {
    setProfileName(profile.name)
  }

    if (!profile?.has_seen_tour) {
    setShowTour(true)
    }

    const startOfDay = viewDate ? new Date(viewDate) : new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: logData } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay.toISOString())
      .lt('logged_at', endOfDay.toISOString())

    const totals = {}
    logData?.forEach((log) => {
      totals[log.tracker_id] = (totals[log.tracker_id] || 0) + log.value
    })
    setTodayLogs(totals)
    setLoading(false)
  }

  async function handleTourComplete() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('profiles')
    .update({
      has_seen_tour: true,
    })
    .eq('user_id', user.id)

  setShowTour(false)
}

  async function handleLog(trackerId) {
    const value = parseFloat(inputValues[trackerId])
    if (!value || value <= 0) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('logs').insert({
      user_id: user.id,
      tracker_id: trackerId,
      value: value,
      logged_at: new Date().toISOString(),
    })

    if (!error) {
      setInputValues({ ...inputValues, [trackerId]: '' })
      loadData()
    }
  }

  async function toggleExpand(trackerId) {
    if (expandedTracker === trackerId) {
      setExpandedTracker(null)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const startOfDay = viewDate ? new Date(viewDate) : new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('tracker_id', trackerId)
      .gte('logged_at', startOfDay.toISOString())
      .lt('logged_at', endOfDay.toISOString())
      .order('logged_at', { ascending: false })

    setDayLogs({ ...dayLogs, [trackerId]: data || [] })
    setExpandedTracker(trackerId)
  }

  async function handleDeleteLog(logId, trackerId) {
    await supabase.from('logs').delete().eq('id', logId)
    loadData()
    toggleExpand(trackerId)
    toggleExpand(trackerId)
  }

  async function handleDeleteTracker(trackerId) {
    const confirmed = window.confirm('Delete this tracker? All its logged data will be removed too.')
    if (!confirmed) return

    await supabase.from('logs').delete().eq('tracker_id', trackerId)
    await supabase.from('trackers').delete().eq('id', trackerId)

    loadData()
  }

  function startEdit(tracker) {
    setEditingTracker(tracker.id)
    setEditValues({ name: tracker.name, unit: tracker.unit, target_value: tracker.target_value })
  }

  async function handleSaveEdit(trackerId) {
    const { error } = await supabase
      .from('trackers')
      .update({
        name: editValues.name,
        unit: editValues.unit,
        target_value: parseFloat(editValues.target_value),
      })
      .eq('id', trackerId)

    if (!error) {
      setEditingTracker(null)
      loadData()
    }
  }

  async function handleAddTracker(e) {
    e.preventDefault()
    if (!newTracker.name || !newTracker.target_value) return

    setAddLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('trackers').insert({
      user_id: user.id,
      name: newTracker.name,
      unit: newTracker.unit || 'units',
      target_value: parseFloat(newTracker.target_value),
      type: 'number',
    })

    setAddLoading(false)

    if (!error) {
      setNewTracker({ name: '', unit: '', target_value: '' })
      setShowAddForm(false)
      loadData()
    }
  }

if (loading) return (
    <>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <Skeleton width="140px" height="14px" style={{ marginBottom: '10px' }} />
        <Skeleton width="240px" height="36px" style={{ marginBottom: '40px' }} />
        <div style={{ display: 'grid', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card">
              <Skeleton width="120px" height="19px" style={{ marginBottom: '10px' }} />
              <Skeleton width="80px" height="14px" style={{ marginBottom: '14px' }} />
              <Skeleton height="8px" radius="100px" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
  return (
    <>
    {showTour && <ProductTour onComplete={handleTourComplete} />}
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <div className="copilot-blob copilot-blob-1" />
        <div className="copilot-blob copilot-blob-2" />
        <div className="copilot-blob copilot-blob-3" />

        <div className="page-enter" style={{ position: 'relative', zIndex: 2, maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
           <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              {viewDate ? new Date(viewDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Today'}
            </p>
            <h1 style={{ fontSize: '36px' }}>
              {profileName ? `Hey ${profileName}, here's your` : 'Your'} <span className="gradient-text">trackers</span>
            </h1>
          </div>
          {streak > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--card)', border: '1px solid var(--card-border)',
              borderRadius: '100px', padding: '8px 16px',
            }}>
              <span style={{ fontSize: '18px' }}>🔥</span>
              <span style={{ fontSize: '15px', fontWeight: 500 }}>{streak} day{streak !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {trackers.map((tracker) => {
            const loggedToday = todayLogs[tracker.id] || 0
            const percent = Math.min(100, Math.round((loggedToday / tracker.target_value) * 100))

            return (
              <div key={tracker.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <WaveFill percent={percent} color={getTrackerColor(tracker.name)} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    {editingTracker === tracker.id ? (
                      <input
                        className="log-input"
                        style={{ maxWidth: '160px' }}
                        value={editValues.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(() => {
                          const Icon = getTrackerIcon(tracker.name)
                          return <Icon size={18} color="var(--teal)" />
                        })()}
                        <h3 style={{ fontSize: '19px' }}>{tracker.name}</h3>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => toggleExpand(tracker.id)}
                        style={{
                          background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--text-low)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        {percent}%
                        <ChevronDown
                          size={14}
                          style={{
                            transform: expandedTracker === tracker.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(tracker)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer' }}
                        title="Edit tracker"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTracker(tracker.id)}
                        style={{
                          background: 'transparent', border: 'none', color: 'var(--text-low)',
                          cursor: 'pointer', fontSize: '16px', padding: '2px 6px', lineHeight: 1,
                        }}
                        title="Delete tracker"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {editingTracker === tracker.id ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="log-input"
                        style={{ width: '80px' }}
                        placeholder="unit"
                        value={editValues.unit}
                        onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })}
                      />
                      <input
                        className="log-input"
                        style={{ width: '90px' }}
                        type="number"
                        placeholder="target"
                        value={editValues.target_value}
                        onChange={(e) => setEditValues({ ...editValues, target_value: e.target.value })}
                      />
                      <button className="log-btn" onClick={() => handleSaveEdit(tracker.id)}>Save</button>
                      <button
                        onClick={() => setEditingTracker(null)}
                        style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-mid)', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginTop: '4px' }}>
                      {loggedToday} / {tracker.target_value} {tracker.unit}
                    </p>
                  )}

                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${percent}%` }} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <input
                      className="log-input"
                      type="number"
                      placeholder={`Add ${tracker.unit}`}
                      value={inputValues[tracker.id] || ''}
                      onChange={(e) =>
                        setInputValues({ ...inputValues, [tracker.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleLog(tracker.id)
                        }
                      }}
                    />
                    <button className="log-btn" onClick={() => handleLog(tracker.id)}>
                      Log
                    </button>
                  </div>

                  {expandedTracker === tracker.id && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--card-border)' }}>
                      {dayLogs[tracker.id]?.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-low)' }}>No entries yet.</p>
                      ) : (
                        dayLogs[tracker.id]?.map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-mid)' }}>
                              {log.value} {tracker.unit} · {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => handleDeleteLog(log.id, tracker.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '20px' }}>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%',
                background: 'var(--card)',
                border: '1px dashed var(--card-border)',
                borderRadius: '14px',
                padding: '16px',
                color: 'var(--text-mid)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              + Add tracker
            </button>
          ) : (
            <form onSubmit={handleAddTracker} className="glass-card">
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>New tracker</h3>
              <input
                className="log-input"
                style={{ width: '100%', marginBottom: '10px' }}
                placeholder="Name (e.g. Meditation)"
                value={newTracker.name}
                onChange={(e) => setNewTracker({ ...newTracker, name: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  className="log-input"
                  style={{ flex: 1 }}
                  placeholder="Unit (e.g. mins)"
                  value={newTracker.unit}
                  onChange={(e) => setNewTracker({ ...newTracker, unit: e.target.value })}
                />
                <input
                  className="log-input"
                  style={{ flex: 1 }}
                  type="number"
                  placeholder="Daily target"
                  value={newTracker.target_value}
                  onChange={(e) => setNewTracker({ ...newTracker, target_value: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="log-btn" disabled={addLoading} style={{ flex: 1 }}>
                  {addLoading ? 'Adding...' : 'Add tracker'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    background: 'transparent', border: '1px solid var(--card-border)',
                    color: 'var(--text-mid)', borderRadius: '10px', padding: '0 20px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
       </div>
        </div>
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--text-mid)' }}>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}