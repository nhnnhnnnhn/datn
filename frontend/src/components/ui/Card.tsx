import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-stone-200 bg-white', className)} {...rest} />
}

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({
  title,
  count,
  action,
  children,
  className,
}: {
  title: ReactNode
  count?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-stone-200 pb-2">
        <h2 className="text-base font-semibold text-stone-900">
          {title}
          {count != null && <span className="ml-1.5 font-normal text-stone-500">— {count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
