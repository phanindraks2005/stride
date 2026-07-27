'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import CountUp from '@/components/CountUp'
import { getTrackerIcon, getTrackerColor } from '@/lib/trackerIcons'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Calendar as CalendarIcon } from 'lucide-react'

export default function Progress() {
  const [trackers, setTrackers] = useState([])
  const [todayTotals, setTodayTotals] = useState({})
  const [selectedTracker, setSelectedTracker] = useState(null)
  const [chartData, setChartData] = useState([])
  const [chartType, setChartType] = useState('line')
  const [timeRange, setTimeRange] = useState('week')
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState(null)
  const router = useRouter()
  const [showCalendar, setShowCalendar] = useState(false)
  const [viewDate, setViewDate] = useState(null)

  useEffect(() => { loadTrackers() }, [viewDate])

  useEffect(() => {
    if (selectedTracker) {
      loadChartData(selectedTracker, timeRange)
      loadComparison(selectedTracker, timeRange)
    }
  }, [selectedTracker, timeRange])

  async function loadTrackers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('trackers').select('*').eq('user_id', user.id)
    setTrackers(data || [])
    if (data && data.length > 0) setSelectedTracker(data[0])

    const startOfDay = viewDate ? new Date(viewDate) : new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: logs } = await supabase
      .from('logs').select('*').eq('user_id', user.id)
      .gte('logged_at', startOfDay.toISOString())
      .lt('logged_at', endOfDay.toISOString())

    const totals = {}
    logs?.forEach((log) => { totals[log.tracker_id] = (totals[log.tracker_id] || 0) + log.value })
    setTodayTotals(totals)
    setLoading(false)
  }

  async function loadChartData(tracker, range = timeRange) {
    const { data: { user } } = await supabase.auth.getUser()

    let startDate = new Date()
    let buckets = []

    if (range === 'week') {
      startDate.setDate(startDate.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        buckets.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), key: d.toDateString(), value: 0 })
      }
    } else if (range === 'month') {
      startDate.setDate(startDate.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        buckets.push({ label: d.getDate().toString(), key: d.toDateString(), value: 0 })
      }
    } else if (range === 'year') {
      startDate.setMonth(startDate.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}`, value: 0 })
      }
    }

    const { data: logs } = await supabase
      .from('logs').select('*').eq('user_id', user.id).eq('tracker_id', tracker.id)
      .gte('logged_at', startDate.toISOString())

    logs?.forEach((log) => {
      const logDate = new Date(log.logged_at)
      const key = range === 'year' ? `${logDate.getFullYear()}-${logDate.getMonth()}` : logDate.toDateString()
      const bucket = buckets.find((b) => b.key === key)
      if (bucket) bucket.value += log.value
    })

    setChartData(buckets.map((b) => ({ date: b.label, value: b.value })))
  }

  async function loadComparison(tracker, range) {
    const { data: { user } } = await supabase.auth.getUser()

    let currentStart = new Date()
    let previousStart = new Date()
    let previousEnd = new Date()

    if (range === 'week') {
      currentStart.setDate(currentStart.getDate() - 6)
      currentStart.setHours(0, 0, 0, 0)
      previousEnd = new Date(currentStart)
      previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 7)
    } else if (range === 'month') {
      currentStart.setDate(currentStart.getDate() - 29)
      currentStart.setHours(0, 0, 0, 0)
      previousEnd = new Date(currentStart)
      previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 30)
    } else if (range === 'year') {
      currentStart.setMonth(currentStart.getMonth() - 11)
      currentStart.setDate(1)
      currentStart.setHours(0, 0, 0, 0)
      previousEnd = new Date(currentStart)
      previousStart = new Date(currentStart)
      previousStart.setMonth(previousStart.getMonth() - 12)
    }

    const { data: currentLogs } = await supabase
      .from('logs').select('value').eq('user_id', user.id).eq('tracker_id', tracker.id)
      .gte('logged_at', currentStart.toISOString())

    const { data: previousLogs } = await supabase
      .from('logs').select('value').eq('user_id', user.id).eq('tracker_id', tracker.id)
      .gte('logged_at', previousStart.toISOString())
      .lt('logged_at', previousEnd.toISOString())

    const currentTotal = currentLogs?.reduce((sum, l) => sum + l.value, 0) || 0
    const previousTotal = previousLogs?.reduce((sum, l) => sum + l.value, 0) || 0

    const percentChange = previousTotal === 0
      ? (currentTotal > 0 ? 100 : 0)
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100)

    setComparison({ currentTotal, previousTotal, percentChange })
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

          <div className="page-enter" style={{ position: 'relative', zIndex: 2, maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
              {viewDate ? new Date(viewDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Overview'}
            </p>
            <h1 style={{ fontSize: '36px' }}>
              Your <span className="gradient-text">progress</span>
            </h1>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                background: 'var(--card)', border: '1px solid var(--card-border)',
                borderRadius: '10px', padding: '9px 14px', color: 'var(--text-mid)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
              }}
            >
              <CalendarIcon size={15} /> {viewDate ? 'Change date' : 'View by date'}
            </button>

            {showCalendar && (
              <div style={{
                position: 'absolute', top: '44px', right: 0, zIndex: 50,
                background: '#161620', border: '1px solid var(--card-border)',
                borderRadius: '14px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}>
                <DayPicker
                  mode="single"
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      setViewDate(`${year}-${month}-${day}`)
                      setShowCalendar(false)
                    }
                  }}
                  disabled={{ after: new Date() }}
                />
                {viewDate && (
                  <button
                    onClick={() => { setViewDate(null); setShowCalendar(false) }}
                    style={{
                      width: '100%', marginTop: '8px', background: 'transparent',
                      border: '1px solid var(--card-border)', color: 'var(--text-mid)',
                      borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    Back to today
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '36px' }}>
          {trackers.map((tracker) => {
            const value = todayTotals[tracker.id] || 0
            const percent = Math.min(100, Math.round((value / tracker.target_value) * 100))
            const gaugeData = [{ value: percent, fill: `url(#gauge-${tracker.id})` }]
            return (
              <div key={tracker.id} style={{ textAlign: 'center', flexShrink: 0 }}>
             <div className={percent >= 100 ? 'gauge-glow-complete' : ''} style={{ width: '80px', height: '80px', position: 'relative' }}>                  <ResponsiveContainer>
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                      <defs>
                        <linearGradient
                          id={`gauge-${tracker.id}`}
                          x1="0" y1="0" x2="1" y2="1"
                          gradientTransform={`rotate(${(Date.now() / 20) % 360}, 0.5, 0.5)`}
                        >
                          <stop offset="0%" stopColor="var(--violet)" />
                          <stop offset="50%" stopColor="var(--coral)" />
                          <stop offset="100%" stopColor="var(--teal)" />
                        </linearGradient>
                      </defs>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        background={{ fill: 'rgba(255,255,255,0.06)' }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 500,
                  }}>
                    <CountUp value={percent} />%
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-mid)', marginTop: '8px' }}>{tracker.name}</p>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {trackers.map((tracker) => {
            const Icon = getTrackerIcon(tracker.name)
            const color = getTrackerColor(tracker.name)
            const isSelected = selectedTracker?.id === tracker.id

            return (
              <button
                key={tracker.id}
                onClick={() => setSelectedTracker(tracker)}
                style={{
                  background: isSelected ? color : 'var(--card)',
                  border: `1px solid ${isSelected ? color : 'var(--card-border)'}`,
                  color: isSelected ? '#0a0a0f' : 'var(--text-mid)',
                  padding: '8px 16px', borderRadius: '100px', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {tracker.name}
              </button>
            )
          })}
        </div>

        {selectedTracker && (
          <>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '18px' }}>
                  {selectedTracker.name} <span style={{ color: 'var(--text-low)', fontWeight: 400, fontSize: '14px' }}>({selectedTracker.unit})</span>
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['week', 'month', 'year'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        style={{
                          background: timeRange === r ? 'linear-gradient(135deg, var(--violet), var(--coral))' : 'transparent',
                          border: '1px solid var(--card-border)',
                          color: timeRange === r ? '#fff' : 'var(--text-mid)',
                          padding: '5px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setChartType('line')}
                      style={{
                        background: chartType === 'line' ? 'var(--card-border)' : 'transparent',
                        border: '1px solid var(--card-border)', color: 'var(--text-mid)',
                        padding: '5px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      style={{
                        background: chartType === 'bar' ? 'var(--card-border)' : 'transparent',
                        border: '1px solid var(--card-border)', color: 'var(--text-mid)',
                        padding: '5px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Bar
                    </button>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="var(--text-low)" fontSize={12} />
                    <YAxis stroke="var(--text-low)" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#161620', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '13px' }} labelStyle={{ color: 'var(--text-hi)' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--violet)" strokeWidth={2.5} dot={{ fill: 'var(--coral)', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="var(--text-low)" fontSize={12} />
                    <YAxis stroke="var(--text-low)" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#161620', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '13px' }} labelStyle={{ color: 'var(--text-hi)' }} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--violet)" />
                        <stop offset="100%" stopColor="var(--coral)" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {comparison && (
              <div className="glass-card" style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-low)', marginBottom: '16px', textTransform: 'capitalize' }}>
                  This {timeRange} vs last {timeRange}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: '28px', fontFamily: 'Fraunces, serif' }}>
                      {comparison.currentTotal} <span style={{ fontSize: '14px', color: 'var(--text-low)' }}>{selectedTracker.unit}</span>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-mid)', marginTop: '4px' }}>
                      vs {comparison.previousTotal} {selectedTracker.unit} previously
                    </p>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: comparison.percentChange >= 0 ? 'rgba(44,232,201,0.15)' : 'rgba(255,107,74,0.15)',
                    color: comparison.percentChange >= 0 ? 'var(--teal)' : 'var(--coral)',
                  }}>
                    {comparison.percentChange >= 0 ? '↑' : '↓'} {Math.abs(comparison.percentChange)}%
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </>
  )
}