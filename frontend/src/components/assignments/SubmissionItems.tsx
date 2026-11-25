import type { SubmissionItem } from '@/types'
import { ScorePill } from '@/components/ui/Score'
import { CRITERIA } from '@/lib/constants'

export function SubmissionItems({ items }: { items: SubmissionItem[] }) {
  return (
    <ol className="divide-y divide-stone-200 border-y border-stone-200">
      {items.map((item, i) => (
        <li key={item.idiomId} className="py-4">
          <div className="flex items-start justify-between gap-4">
            <p className="font-serif text-lg font-semibold text-stone-900">
              <span className="mr-2 font-sans text-sm font-normal text-stone-400">{i + 1}.</span>
              {item.phrase}
            </p>
            <ScorePill score={item.overall} />
          </div>
          <p className="mt-2 rounded-md bg-stone-50 px-3 py-2 text-[15px] text-stone-800">{item.answer}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {CRITERIA.map(({ key, label, color }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                {label} {item.scores[key]}/5
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-sm text-stone-600">{item.summary}</p>
        </li>
      ))}
    </ol>
  )
}
