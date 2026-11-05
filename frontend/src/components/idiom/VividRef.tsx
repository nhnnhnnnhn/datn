import { cn } from '@/lib/cn'

export function VividRef({ id, className }: { id: number; className?: string }) {
  return (
    <span title={`Mục số ${id} trong bộ dữ liệu VIVID`} className={cn('text-xs text-stone-500 tabular-nums', className)}>
      VIVID #{id}
    </span>
  )
}
