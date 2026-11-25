import type { GradingResult } from '@/types'
import { ScorePill } from '@/components/ui/Score'
import { cn } from '@/lib/cn'

export function AttemptHistory({
  attempts,
  selected,
  onSelect,
}: {
  attempts: GradingResult[]
  selected: number
  onSelect: (index: number) => void
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-900">Các lần nộp</h3>
      <ol className="mt-2 divide-y divide-stone-100 rounded-md border border-stone-200">
        {attempts.map((a, i) => {
          const delta = i > 0 ? a.overall - attempts[i - 1].overall : null
          return (
            <li key={a.id}>
              <button
                onClick={() => onSelect(i)}
                className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-sm', i === selected ? 'bg-stone-50' : 'hover:bg-stone-50')}
              >
                <span className={cn('w-12', i === selected ? 'font-semibold text-stone-900' : 'text-stone-600')}>Lần {i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-stone-500">{a.answer}</span>
                {delta !== null && delta !== 0 && (
                  <span className={cn('text-xs font-medium tabular-nums', delta > 0 ? 'text-emerald-700' : 'text-red-700')}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
                <ScorePill score={a.overall} />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
