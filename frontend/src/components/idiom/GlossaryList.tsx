import { Link } from 'react-router'
import type { GlossaryItem } from '@/types'

export interface GlossaryEntry extends GlossaryItem {
  source?: { id: number; phrase: string }
}

export function GlossaryList({ items }: { items: GlossaryEntry[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((g) => (
        <li key={`${g.term}-${g.source?.id ?? ''}`} className="flex gap-4 py-3">
          <span className="w-24 shrink-0 font-serif text-xl leading-tight text-stone-900">{g.term}</span>
          <div className="min-w-0 text-sm">
            <p className="text-stone-800">{g.meaning}</p>
            {g.source && (
              <Link to={`/idioms/${g.source.id}`} className="mt-1 inline-block text-xs text-stone-500 hover:text-brand-700">
                trong “{g.source.phrase}”
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
