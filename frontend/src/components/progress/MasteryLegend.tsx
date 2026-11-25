import { MASTERY, MASTERY_LEVELS } from '@/lib/constants'

export function MasteryLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {MASTERY_LEVELS.map((level) => (
        <li key={level} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: MASTERY[level].color }} />
          {MASTERY[level].label}
        </li>
      ))}
    </ul>
  )
}
