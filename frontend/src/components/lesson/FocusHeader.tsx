import { X } from 'lucide-react'
import { ProgressBar } from '@/components/ui/Feedback'

export function FocusHeader({ progress, label, onExit }: { progress: number; label?: string; onExit: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-5">
      <button onClick={onExit} className="rounded p-1 text-stone-400 hover:text-stone-700" aria-label="Thoát">
        <X className="size-6" />
      </button>
      <ProgressBar value={progress} className="h-3 flex-1" barClassName="bg-correct" />
      {label && <span className="w-14 text-right text-sm text-stone-500 tabular-nums">{label}</span>}
    </div>
  )
}
