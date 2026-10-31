import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

type SheetState = { kind: 'idle'; canCheck: boolean } | { kind: 'correct'; explanation: string } | { kind: 'wrong'; answer: string; explanation: string }

export function FeedbackSheet({ state, onCheck, onContinue, continueLabel }: { state: SheetState; onCheck: () => void; onContinue: () => void; continueLabel: string }) {
  if (state.kind === 'idle') {
    return (
      <div className="border-t-2 border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl justify-end px-4 py-5">
          <Button variant="dark" size="lg" className="w-full sm:w-40" disabled={!state.canCheck} onClick={onCheck}>
            Kiểm tra
          </Button>
        </div>
      </div>
    )
  }
  const correct = state.kind === 'correct'
  return (
    <div role="status" className={cn('animate-sheet-up', correct ? 'bg-correct-bg text-correct-ink' : 'bg-wrong-bg text-wrong-ink')}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-bold">{correct ? 'Chính xác!' : 'Chưa đúng'}</p>
          {!correct && (
            <p className="mt-1 text-sm">
              Đáp án đúng: <span className="font-semibold">{state.answer}</span>
            </p>
          )}
          {state.explanation && <p className="mt-1 max-w-xl text-sm opacity-90">{state.explanation}</p>}
        </div>
        <button
          onClick={onContinue}
          autoFocus
          className={cn('h-11 w-full shrink-0 rounded-md px-5 text-[15px] font-semibold text-white sm:w-40', correct ? 'bg-correct hover:brightness-110' : 'bg-wrong hover:brightness-110')}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}

export type { SheetState }
