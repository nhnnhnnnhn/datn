import { useId, useState } from 'react'

export interface AreaPoint {
  date: string
  value: number
}

const W = 600
const H = 200
const PAD = { top: 16, right: 16, bottom: 28, left: 32 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const dayMonth = (isoDate: string) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`
const niceMax = (value: number) => Math.max(4, Math.ceil(value / 2) * 2)

// Horizontal tangents at every point keep the curve from overshooting between days
function smoothPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = points[i - 1]
      const mid = (prev.x + p.x) / 2
      return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')
}

export function AreaChart({ data, unit }: { data: AreaPoint[]; unit: string }) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const step = data.length > 1 ? PLOT_W / (data.length - 1) : 0
  const points = data.map((d, i) => ({ x: PAD.left + i * step, y: PAD.top + PLOT_H - (d.value / max) * PLOT_H }))
  const baseline = PAD.top + PLOT_H
  const line = smoothPath(points)
  const area = points.length ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z` : ''
  const ticks = [0, max / 2, max]
  const labelAt = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])
  const active = hover === null ? null : { point: points[hover], item: data[hover] }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Biểu đồ vùng: ${data.map((d) => `${dayMonth(d.date)} ${d.value}`).join(', ')}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = PAD.top + PLOT_H - (tick / max) * PLOT_H
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="stroke-stone-200" strokeDasharray={tick === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-stone-400 text-[11px]">
                {tick}
              </text>
            </g>
          )
        })}

        <path d={area} fill={`url(#${gradientId})`} className="chart-fade" />
        <path d={line} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="chart-draw" />

        {data.map((d, i) => (
          <g key={d.date}>
            {labelAt.has(i) && (
              <text x={points[i].x} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-stone-500 text-[11px]">
                {dayMonth(d.date)}
              </text>
            )}
            {d.value > 0 && <circle cx={points[i].x} cy={points[i].y} r={3} fill="white" stroke="var(--color-brand-600)" strokeWidth="2" className="chart-fade" />}
          </g>
        ))}

        {active && (
          <g pointerEvents="none">
            <line x1={active.point.x} x2={active.point.x} y1={PAD.top} y2={baseline} className="stroke-stone-300" strokeDasharray="3 3" />
            <circle cx={active.point.x} cy={active.point.y} r={5.5} fill="var(--color-brand-600)" stroke="white" strokeWidth="2" />
            <g transform={`translate(${Math.min(Math.max(active.point.x - 52, PAD.left), W - PAD.right - 104)}, ${Math.max(active.point.y - 50, 0)})`}>
              <rect width="104" height="38" rx="6" className="fill-stone-900" />
              <text x="52" y="15" textAnchor="middle" className="fill-stone-300 text-[11px]">
                {dayMonth(active.item.date)}
              </text>
              <text x="52" y="30" textAnchor="middle" className="fill-white text-[12px] font-semibold">
                {active.item.value} {unit}
              </text>
            </g>
          </g>
        )}

        {data.map((d, i) => (
          <rect
            key={d.date}
            x={points[i].x - step / 2}
            y={PAD.top}
            width={Math.max(step, 1)}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
    </div>
  )
}
