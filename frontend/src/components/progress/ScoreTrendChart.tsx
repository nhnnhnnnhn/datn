import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyPoint } from '@/types'

const AXIS = { stroke: '#a8a29e', fontSize: 12 }

const shortDate = (key: string) => {
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number | null }[]; label?: string }) {
  if (!active || !payload?.length || payload[0].value == null) return null
  return (
    <div className="rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 shadow-sm">
      {shortDate(label ?? '')}: {payload[0].value.toFixed(1)} điểm
    </div>
  )
}

export function ScoreTrendChart({ points }: { points: DailyPoint[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#ece9e4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ stroke: '#d6d3d1' }} content={<TrendTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1c1917"
            strokeWidth={2}
            connectNulls
            dot={{ r: 4, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
