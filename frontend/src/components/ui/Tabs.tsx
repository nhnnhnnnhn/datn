import { cn } from '@/lib/cn'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-stone-200', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
            value === t.value ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
