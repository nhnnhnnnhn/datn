import { Link } from 'react-router'
import type { Idiom } from '@/types'
import { TOPICS } from '@/lib/constants'
import { firstSentence } from '@/lib/text'
import { IdiomTags } from './IdiomTags'
import { VividRef } from './VividRef'

export function IdiomResult({ idiom }: { idiom: Idiom }) {
  return (
    <article className="grid gap-x-6 gap-y-2 border-b border-stone-200 py-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <div>
        <h3 className="font-serif text-xl leading-snug font-semibold text-stone-900">
          <Link to={`/idioms/${idiom.id}`} className="hover:text-brand-700">
            {idiom.phrase}
          </Link>
        </h3>
        <div className="mt-2">
          <IdiomTags idiom={idiom} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500">
          <VividRef id={idiom.id} /> · {TOPICS[idiom.topic].label}
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-stone-800">
          <span className="mr-1.5 text-stone-400">1.</span>
          {firstSentence(idiom.explanation)}
        </p>
        <div className="mt-1 text-right">
          <Link to={`/idioms/${idiom.id}`} className="text-xs text-stone-500 hover:text-brand-700">
            Chi tiết ▸
          </Link>
        </div>
      </div>
    </article>
  )
}
