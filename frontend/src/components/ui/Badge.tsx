import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        className ?? 'bg-stone-100 text-stone-700 ring-stone-200',
      )}
    >
      {children}
    </span>
  )
}
