import type { MasteryLevel } from '@/types'
import { MASTERY, MASTERY_LEVELS } from '@/lib/constants'

export function MasteryBar({ levels, total }: { levels: Record<MasteryLevel, number>; total: number }) {
  const ordered = [...MASTERY_LEVELS].reverse()
  const description = ordered
    .filter((l) => levels[l] > 0)
    .map((l) => `${levels[l]} ${MASTERY[l].label.toLowerCase()}`)
    .join(', ')
  return (
    <div role="img" aria-label={description} title={description} className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm">
      {ordered.map((l) =>
        levels[l] > 0 ? <span key={l} style={{ width: `${(levels[l] / total) * 100}%`, backgroundColor: MASTERY[l].color }} /> : null,
      )}
    </div>
  )
}
