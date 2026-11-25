import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

function pageItems(page: number, pages: number): (number | 'gap-left' | 'gap-right')[] {
  const around = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const sorted = [...around].sort((a, b) => a - b)
  const items: (number | 'gap-left' | 'gap-right')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push(i === 1 ? 'gap-left' : 'gap-right')
    items.push(n)
  })
  return items
}

const cell = 'inline-flex size-9 items-center justify-center rounded-md text-sm tabular-nums'

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
        className={cn(cell, 'text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent')}
      >
        <ChevronLeft className="size-4" />
      </button>
      {pageItems(page, pages).map((item) =>
        typeof item === 'string' ? (
          <span key={item} className={cn(cell, 'text-stone-400')}>
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(cell, item === page ? 'bg-stone-900 font-medium text-white' : 'text-stone-700 hover:bg-stone-100')}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Trang sau"
        className={cn(cell, 'text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent')}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
