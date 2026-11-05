import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { buttonClass } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Feedback'
import { TOPICS } from '@/lib/constants'

export function DailyIdiomFeature() {
  const { data } = useQuery({ queryKey: ['idioms', 'daily'], queryFn: api.idioms.daily, meta: { tag: 'IDIOM' } })
  return (
    <section aria-labelledby="daily-idiom" className="rounded-xl border border-brand-200 bg-brand-50 p-6 sm:p-8">
      <p id="daily-idiom" className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
        Câu của ngày
      </p>
      {data ? (
        <>
          <Link to={`/idioms/${data.id}`} className="mt-3 block font-serif text-3xl leading-tight font-bold text-stone-900 hover:text-brand-700 sm:text-4xl">
            {data.phrase}
          </Link>
          <p className="mt-2 text-sm text-stone-500">
            VIVID #{data.id} · {TOPICS[data.topic].label}
          </p>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-stone-800">{data.explanation}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/practice?idiom=${data.id}`} className={buttonClass('primary')}>
              Thử tự giải nghĩa
            </Link>
            <Link to={`/idioms/${data.id}`} className={buttonClass('outline')}>
              Xem chi tiết
            </Link>
          </div>
        </>
      ) : (
        <Spinner />
      )}
    </section>
  )
}
