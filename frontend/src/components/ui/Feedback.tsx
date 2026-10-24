import type { ReactNode } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ label = 'Đang tải…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-stone-500', className)}>
      <LoaderCircle className="size-5 animate-spin text-brand-500" />
      {label}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-2xl bg-stone-100 p-3 text-stone-400">{icon}</div>}
      <p className="font-medium text-stone-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra'
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <TriangleAlert className="size-4 shrink-0" />
      {message}
    </div>
  )
}

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-stone-100', className)}>
      <div
        className={cn('h-full rounded-full bg-brand-500 transition-all duration-500', barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  )
}
