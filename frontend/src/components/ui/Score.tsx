import { cn } from '@/lib/cn'

export function scoreClass(score: number) {
  if (score >= 4) return 'bg-emerald-50 text-emerald-800'
  if (score >= 3) return 'bg-amber-50 text-amber-800'
  return 'bg-red-50 text-red-800'
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 min-w-9 items-center justify-center rounded px-1.5 text-sm font-semibold tabular-nums', scoreClass(score), className)}>
      {Number.isInteger(score) ? score : score.toFixed(1)}/5
    </span>
  )
}
