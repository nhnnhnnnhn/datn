import type { GlossaryItem } from '@/types'

export function GlossaryList({ items }: { items: GlossaryItem[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((g) => (
        <li key={g.term} className="flex gap-4 py-3">
          <span className="w-24 shrink-0 font-serif text-xl leading-tight text-stone-900">{g.term}</span>
          <p className="min-w-0 text-sm text-stone-800">{g.meaning}</p>
        </li>
      ))}
    </ul>
  )
}
