import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Tag({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', className ?? 'bg-stone-100 text-stone-600')}
    >
      {children}
    </span>
  )
}
