import { cn } from '@/lib/cn'

export function scoreTone(score: number) {
  if (score >= 4) return { text: 'text-emerald-600', stroke: '#059669', bg: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' }
  if (score >= 3) return { text: 'text-gold-600', stroke: '#bd6e1b', bg: 'bg-gold-500', soft: 'bg-gold-50 text-gold-700' }
  return { text: 'text-brand-600', stroke: '#b93a2e', bg: 'bg-brand-500', soft: 'bg-brand-50 text-brand-700' }
}

export function ScoreRing({ score, size = 112, className }: { score: number; size?: number; className?: string }) {
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = scoreTone(score)
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5f5f4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 5)}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-serif text-3xl font-bold leading-none', tone.text)}>{score}</span>
        <span className="mt-1 text-xs text-stone-400">/ 5 điểm</span>
      </div>
    </div>
  )
}
