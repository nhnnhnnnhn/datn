import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

export function ChartCard({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: ReactNode }) {
  return (
    <Panel className={cn('p-4', className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        {subtitle && <span className="text-xs text-stone-500">{subtitle}</span>}
      </div>
      {children}
    </Panel>
  )
}
