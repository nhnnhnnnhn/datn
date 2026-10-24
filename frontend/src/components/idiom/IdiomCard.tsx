import { Link } from 'react-router'
import type { Idiom } from '@/types'
import { IdiomBadges } from './IdiomBadges'

export function IdiomCard({ idiom }: { idiom: Idiom }) {
  return (
    <Link
      to={`/idioms/${idiom.id}`}
      className="group flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-900/[0.03] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <h3 className="font-serif text-lg font-semibold leading-snug text-stone-900 group-hover:text-brand-700">
        {idiom.phrase}
      </h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-stone-500">{idiom.explanation}</p>
      <div className="mt-4">
        <IdiomBadges idiom={idiom} short />
      </div>
    </Link>
  )
}
