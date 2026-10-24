import type { Idiom, TopicId, TraitId } from '@/types'
import { KINDS, TOPICS, TRAITS } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'

export function TopicBadge({ topic }: { topic: TopicId }) {
  return <Badge className={TOPICS[topic].badge}>{TOPICS[topic].label}</Badge>
}

export function TraitBadge({ trait, short }: { trait: TraitId; short?: boolean }) {
  return (
    <span title={TRAITS[trait].hint}>
      <Badge className="bg-white text-stone-600 ring-stone-300">{short ? TRAITS[trait].short : TRAITS[trait].label}</Badge>
    </span>
  )
}

export function IdiomBadges({ idiom, short }: { idiom: Idiom; short?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge className="bg-gold-50 text-gold-700 ring-gold-200">{KINDS[idiom.kind]}</Badge>
      <TopicBadge topic={idiom.topic} />
      {idiom.traits.map((t) => (
        <TraitBadge key={t} trait={t} short={short} />
      ))}
    </div>
  )
}
