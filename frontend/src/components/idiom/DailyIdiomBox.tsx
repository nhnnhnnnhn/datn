import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { firstSentence } from '@/lib/text'
import { VividRef } from './VividRef'

export function DailyIdiomBox() {
  const { data } = useQuery({ queryKey: ['idioms', 'daily'], queryFn: api.idioms.daily, meta: { tag: 'IDIOM' } })
  const today = new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Câu của ngày</p>
      <p className="text-xs text-stone-400">{today}</p>
      {data && (
        <>
          <Link to={`/idioms/${data.id}`} className="mt-3 block font-serif text-xl leading-snug font-semibold text-stone-900 hover:text-brand-700">
            {data.phrase}
          </Link>
          <VividRef id={data.id} />
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{firstSentence(data.explanation)}</p>
          <Link to={`/practice?idiom=${data.id}`} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
            Thử tự giải nghĩa →
          </Link>
        </>
      )}
    </div>
  )
}
