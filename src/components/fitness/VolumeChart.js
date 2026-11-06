'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toShownWeight } from '@/lib/units'

// Volume bars in the workout hue. Loaded on demand (next/dynamic), so Recharts
// only downloads when a chart is on screen. `tip` is the tooltip element.
export default function VolumeChart({ data, tip, units, reduced, interval = 0, maxBarSize = 36, duration = 900 }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 4, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#ffffff10" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#958ca3', fontSize: 11.5 }} interval={interval} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#958ca3', fontSize: 12 }} width={46} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
        <Tooltip content={tip} cursor={{ fill: '#ffffff08' }} />
        <Bar dataKey={(d) => toShownWeight(d.volume, units)} fill="var(--t-workout)" radius={[6, 6, 2, 2]} maxBarSize={maxBarSize} isAnimationActive={!reduced} animationDuration={duration} />
      </BarChart>
    </ResponsiveContainer>
  )
}
