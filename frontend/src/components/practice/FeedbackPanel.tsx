import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import type { Criterion, GradingResult } from '@/types'
import { CRITERIA, USE_MOCK } from '@/lib/constants'
import { VIVID } from '@/lib/vivid'
import { ScorePill } from '@/components/ui/Score'
import { cn } from '@/lib/cn'

export function FeedbackPanel({ result }: { result: GradingResult }) {
  const { feedback, scores } = result
  const [open, setOpen] = useState<Criterion | null>(feedback.issues[0]?.criterion ?? null)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">Điểm tổng</h3>
        <ScorePill score={result.overall} className="h-7 text-base" />
      </div>
      <p className="mt-1.5 text-sm text-stone-700">{feedback.summary}</p>

      <ul className="mt-4 divide-y divide-stone-100 border-y border-stone-100">
        {CRITERIA.map(({ key, label, color }) => {
          const issues = feedback.issues.filter((i) => i.criterion === key)
          const expanded = open === key
          return (
            <li key={key}>
              <button
                onClick={() => setOpen(expanded ? null : key)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 text-sm text-stone-800">
                  {label}
                  {issues.length > 0 && <span className="ml-1.5 text-xs text-stone-500">({issues.length} góp ý)</span>}
                </span>
                <span className="flex gap-0.5" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="h-2 w-3 rounded-[2px]" style={{ backgroundColor: n <= scores[key] ? color : '#e7e5e4' }} />
                  ))}
                </span>
                <span className="w-7 text-right text-sm font-medium text-stone-700 tabular-nums">{scores[key]}/5</span>
                <ChevronDown className={cn('size-4 text-stone-400 transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <div className="pb-3 pl-5.5">
                  <p className="text-sm text-stone-600">{feedback.comments[key]}</p>
                  {issues.map((issue) => (
                    <div key={issue.type} className="mt-2 border-l-2 py-1 pl-3" style={{ borderColor: color }}>
                      <p className="text-sm font-medium text-stone-900">{issue.title}</p>
                      <p className="mt-0.5 text-sm text-stone-600">{issue.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {scores.accuracy === 0 && <p className="mt-2 text-xs text-stone-500">Ý nghĩa cốt lõi được 0 điểm nên điểm tổng bằng 0.</p>}
      <p className="mt-2 text-xs text-stone-500">
        4 tiêu chí theo judge aspect-based của{' '}
        <Link to="/about" className="underline decoration-stone-300 underline-offset-2 hover:text-brand-700">
          VIVID
        </Link>{' '}
        (κ = {VIVID.judgeKappa.toLocaleString('vi-VN')} so với người chấm); nhóm lỗi theo phần phân tích lỗi của bài báo.
      </p>

      {feedback.strengths.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Làm tốt</h4>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm text-stone-700">
            {feedback.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {USE_MOCK && (
        <p className="mt-4 text-xs leading-relaxed text-stone-400">
          Bản demo chấm bằng so khớp từ ngữ với giải nghĩa chuẩn của VIVID. Khi có máy chủ, bài được chấm bằng LLM với prompt aspect-based của bài báo.
        </p>
      )}
    </div>
  )
}
