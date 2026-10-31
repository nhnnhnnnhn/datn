import type { Idiom } from '@/types'
import { TRAITS } from '@/lib/constants'
import { Tag } from '@/components/ui/Badge'

export function IdiomTags({ idiom }: { idiom: Idiom }) {
  if (idiom.traits.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {idiom.traits.map((t) => (
        <Tag key={t} title={`Nhãn đặc trưng trong VIVID: ${TRAITS[t].hint}`}>
          {TRAITS[t].label}
        </Tag>
      ))}
    </div>
  )
}
