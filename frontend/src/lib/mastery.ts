import type { MasteryLevel } from '@/types'

export function masteryFromScore(avgScore: number | null): MasteryLevel {
  if (avgScore == null) return 'not_started'
  if (avgScore < 2) return 'attempted'
  if (avgScore < 3) return 'familiar'
  if (avgScore < 4) return 'proficient'
  return 'mastered'
}
