import type { ActivityDay } from '@/types'

// Single-hue ramp, validated for contrast against the page surface
const HEAT = ['#f0ede8', '#10b981', '#047857', '#065f46', '#022c22']

export function ActivityHeatmap({ days }: { days: ActivityDay[] }) {
  // pad the first column so weeks start on Monday
  const first = new Date(days[0].date)
  const offset = (first.getDay() + 6) % 7
  const cells: (ActivityDay | null)[] = [...Array(offset).fill(null), ...days]
  const weeks: (ActivityDay | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4)
  const activeDays = days.filter((d) => d.count > 0).length

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="grid shrink-0 grid-rows-7 gap-1 text-[10px] text-stone-400">
          {['T2', '', 'T4', '', 'T6', '', 'CN'].map((d, i) => (
            <span key={i} className="flex h-3.5 items-center">
              {d}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-rows-7 gap-1">
              {week.map((day, di) =>
                day ? (
                  <div
                    key={di}
                    title={`${new Date(day.date).toLocaleDateString('vi-VN')}: ${day.count} hoạt động`}
                    className="size-3.5 rounded-[2px]"
                    style={{ backgroundColor: HEAT[level(day.count)] }}
                  />
                ) : (
                  <div key={di} className="size-3.5" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>{activeDays} ngày có hoạt động trong 12 tuần</span>
        <span className="flex items-center gap-1">
          Ít
          {HEAT.map((c) => (
            <span key={c} className="size-3 rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          Nhiều
        </span>
      </div>
    </div>
  )
}
