export interface BarItem {
  label: string
  value: number
}

export function BarList({ items, unit }: { items: BarItem[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const total = items.reduce((sum, i) => sum + i.value, 0)

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item.label} className="group grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
          <span className="truncate text-stone-700">{item.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`${item.label}: ${item.value} ${unit}`}>
            <div
              className="chart-grow h-full origin-left rounded-full bg-brand-500 transition-colors group-hover:bg-brand-700"
              style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${index * 70}ms` }}
            />
          </div>
          <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
            <span className="font-medium text-stone-900">{item.value.toLocaleString('vi-VN')}</span>
            <span className="w-9 text-right text-xs text-stone-500">{total ? Math.round((item.value / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
