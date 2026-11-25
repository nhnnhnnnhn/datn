import { Flame } from 'lucide-react'
import type { ProgressSummary } from '@/types'
import { ProgressBar } from '@/components/ui/Feedback'
import { toDateKey } from '@/lib/text'
import { cn } from '@/lib/cn'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function StreakBox({ summary }: { summary: ProgressSummary }) {
  const active = new Set(summary.activity.filter((d) => d.count > 0).map((d) => d.date))
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const week = WEEKDAYS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { label, key: toDateKey(d), future: d > today }
  })

  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-center gap-2">
        <Flame className={cn('size-6', summary.todayCount ? 'text-orange-500' : 'text-stone-300')} fill={summary.todayCount ? 'currentColor' : 'none'} />
        <div>
          <p className="text-lg leading-tight font-bold text-stone-900">{summary.streak} ngày liên tiếp</p>
          <p className="text-xs text-stone-500">{summary.todayCount ? 'Hôm nay đã học' : 'Học một bài để giữ chuỗi'}</p>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
        {week.map((d) => (
          <li key={d.key}>
            <span className="block text-[11px] text-stone-500">{d.label}</span>
            <span
              className={cn(
                'mx-auto mt-1 block size-5 rounded-full border',
                active.has(d.key) ? 'border-orange-500 bg-orange-500' : d.future ? 'border-dashed border-stone-200' : 'border-stone-300',
              )}
            />
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-stone-100 pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-stone-800">Mục tiêu ngày</span>
          <span className="text-stone-500 tabular-nums">
            {Math.min(summary.todayCount, summary.dailyGoal)}/{summary.dailyGoal} hoạt động
          </span>
        </div>
        <ProgressBar value={summary.todayCount / summary.dailyGoal} className="mt-2 h-2" barClassName="bg-orange-500" />
      </div>
    </div>
  )
}
