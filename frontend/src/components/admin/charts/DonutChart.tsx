import { useState } from 'react'
import { cn } from '@/lib/cn'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

const SIZE = 160
const RADIUS = 56
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0)

  let offset = 0
  const arcs = slices.map((slice, index) => {
    const length = total ? (slice.value / total) * CIRCUMFERENCE : 0
    const arc = { slice, index, length: Math.max(length - (slices.length > 1 && length > 0 ? GAP : 0), 0), offset }
    offset += length
    return arc
  })
  const focused = hover === null ? null : slices[hover]

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:flex-col xl:flex-row">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-40 shrink-0" role="img" aria-label={`Biểu đồ tròn: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-stone-100" />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs
            .filter((a) => a.length > 0)
            .map(({ slice, index, length, offset: start }) => (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === index ? STROKE + 4 : STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                className="chart-donut cursor-pointer transition-[stroke-width] duration-150"
                style={{ '--circ': CIRCUMFERENCE, animationDelay: `${index * 120}ms` } as React.CSSProperties}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
        </g>
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" className="fill-stone-900 text-[26px] font-semibold">
          {(focused ? focused.value : total).toLocaleString('vi-VN')}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="fill-stone-500 text-[11px]">
          {focused ? `${focused.label} · ${percent(focused.value)}%` : centerLabel}
        </text>
      </svg>

      <ul className="w-full max-w-56 space-y-2 text-sm">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            className={cn('flex items-center gap-2 rounded-md px-2 py-1 transition-colors', hover === index && 'bg-stone-50')}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate text-stone-700">{slice.label}</span>
            <span className="font-medium text-stone-900 tabular-nums">{slice.value.toLocaleString('vi-VN')}</span>
            <span className="w-9 text-right text-xs text-stone-500 tabular-nums">{percent(slice.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
