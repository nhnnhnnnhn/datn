import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { GradingHint, HintLevel } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/cn'

const log = createLogger('GRADING')

const STEPS: { level: HintLevel; title: string }[] = [
  { level: 1, title: 'Câu hỏi gợi mở' },
  { level: 2, title: 'Nghĩa của từ, chủ đề' },
  { level: 3, title: 'Câu mở đầu' },
]

export function HintLadder({ idiomId }: { idiomId: number }) {
  const [hints, setHints] = useState<GradingHint[]>([])
  const next = STEPS[hints.length]

  const open = useMutation({
    mutationFn: (level: HintLevel) => api.grading.hint(idiomId, level),
    meta: { tag: 'GRADING' },
    onSuccess: (hint) => {
      log.info('opened hint', { idiomId, level: hint.level })
      setHints((h) => [...h, hint])
    },
  })

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-900">Gợi ý</h3>
        <span className="text-xs text-stone-500">Đã mở {hints.length}/3</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">Thử tự nghĩ trước. Mỗi bậc gợi ý cụ thể hơn bậc trước.</p>
      <ol className="mt-3 space-y-2">
        {STEPS.map((step, i) => {
          const hint = hints[i]
          return (
            <li key={step.level} className={cn('rounded-md border px-3 py-2', hint ? 'border-stone-300 bg-stone-50' : 'border-dashed border-stone-200')}>
              <p className={cn('text-xs font-medium', hint ? 'text-stone-700' : 'text-stone-400')}>
                Bậc {step.level} · {step.title}
              </p>
              {hint && <p className="mt-1 text-sm leading-relaxed text-stone-800">{hint.text}</p>}
            </li>
          )
        })}
      </ol>
      {next && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => open.mutate(next.level)} loading={open.isPending}>
          Mở gợi ý bậc {next.level}
        </Button>
      )}
    </div>
  )
}
