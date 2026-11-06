'use client'
import { useId } from 'react'
import {
  Area, Bar, Cell, ComposedChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { getTrackerColor } from '@/lib/trackerIcons'
import { fmt } from '@/components/today/format'
import styles from './progress.module.css'

// Loaded on demand (next/dynamic), so Recharts only downloads with the chart

// Short enough for a phone's y axis: 4,370 → 4.4k
function axisLabel(v) {
  if (v >= 10000) return `${Math.round(v / 1000)}k`
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`
  return fmt(Math.round(v * 10) / 10)
}

function ChartTip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className={styles.tip}>
      <span>{point.full}</span>
      <b className="tnum">{fmt(point.value)} {unit}</b>
    </div>
  )
}

export default function TrendChart({ tracker, data, period, reduced }) {
  const hue = getTrackerColor(tracker)
  const gradId = useId().replace(/:/g, '')
  const max = Math.max(tracker.target_value || 0, ...data.map((d) => d.value)) * 1.15 || 1
  const common = { isAnimationActive: !reduced, animationDuration: 900, animationEasing: 'ease-out' }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity={0.45} />
            <stop offset="100%" stopColor={hue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#ffffff10" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#958ca3', fontSize: 12 }} interval={period === 'month' ? 4 : 0} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#958ca3', fontSize: 12 }} domain={[0, max]} tickFormatter={axisLabel} width={40} />
        <Tooltip content={<ChartTip unit={tracker.unit} />} cursor={{ fill: '#ffffff08', stroke: '#ffffff20' }} />
        {tracker.target_value > 0 && (
          <ReferenceLine y={tracker.target_value} stroke="#d4ff3a" strokeDasharray="4 5" strokeOpacity={0.7}
            label={{ value: 'Goal', position: 'insideTopRight', fill: '#d4ff3a', fontSize: 12, fontWeight: 600 }} />
        )}
        {period === 'week' ? (
          <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={44} {...common}>
            {data.map((d, i) => <Cell key={i} fill={hue} fillOpacity={d.hit ? 1 : 0.42} />)}
          </Bar>
        ) : (
          <Area type="monotone" dataKey="value" stroke={hue} strokeWidth={2.5} fill={`url(#${gradId})`} dot={false}
            activeDot={{ r: 5, fill: hue, stroke: '#0b0c14', strokeWidth: 2 }} {...common} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
