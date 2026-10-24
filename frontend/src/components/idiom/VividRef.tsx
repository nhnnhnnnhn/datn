import { Link } from 'react-router'
import { cn } from '@/lib/cn'

export function VividRef({ id, className }: { id: number; className?: string }) {
  return (
    <Link to="/about" title={`Mục số ${id} trong bộ dữ liệu VIVID`} className={cn('text-xs text-stone-500 tabular-nums hover:text-brand-700', className)}>
      VIVID #{id}
    </Link>
  )
}
