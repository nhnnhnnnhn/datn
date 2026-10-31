import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GradingResult, Idiom } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { VividRef } from '@/components/idiom/VividRef'
import { createLogger } from '@/lib/logger'
import { syllables } from '@/lib/text'
import { HintLadder } from './HintLadder'
import { FeedbackPanel } from './FeedbackPanel'
import { AttemptHistory } from './AttemptHistory'

const gradingLog = createLogger('GRADING')
const flashcardLog = createLogger('FLASHCARD')

export function PracticeSession({ idiom, onNext, nextLoading }: { idiom: Idiom; onNext: () => void; nextLoading: boolean }) {
  const queryClient = useQueryClient()
  const [answer, setAnswer] = useState('')
  const [attempts, setAttempts] = useState<GradingResult[]>([])
  const [selected, setSelected] = useState(0)
  const [editing, setEditing] = useState(true)
  const [showReference, setShowReference] = useState(false)

  const grade = useMutation({
    mutationFn: () => api.grading.grade(idiom.id, answer),
    meta: { tag: 'GRADING' },
    onMutate: () => gradingLog.debug('grading started', { idiomId: idiom.id, attempt: attempts.length + 1 }),
    onSuccess: (result) => {
      gradingLog.info('graded answer', {
        idiomId: idiom.id,
        attemptId: result.id,
        attempt: attempts.length + 1,
        overall: result.overall,
        issues: result.feedback.issues.map((i) => i.type),
      })
      setAttempts((prev) => [...prev, result])
      setSelected(attempts.length)
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['grading'] })
    },
  })
  const save = useMutation({
    mutationFn: () => api.flashcards.saveIdiom(idiom.id),
    meta: { tag: 'FLASHCARD' },
    onSuccess: (card) => {
      flashcardLog.info('saved idiom', { idiomId: idiom.id, cardId: card.id })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
    },
  })

  const words = syllables(answer).length
  const current = attempts[selected]
  const unchanged = attempts.length > 0 && answer.trim() === attempts.at(-1)!.answer

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <p className="text-sm text-stone-500">Giải nghĩa câu sau bằng lời của em:</p>
        <h2 className="mt-1 font-serif text-3xl leading-snug font-bold text-stone-900">{idiom.phrase}</h2>
        <VividRef id={idiom.id} />

        <div className="mt-5">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && editing && words > 0) grade.mutate()
            }}
            rows={7}
            readOnly={!editing}
            placeholder="Câu này có nghĩa là… Người ta dùng câu này khi…"
            aria-label="Lời giải nghĩa của bạn"
            className={editing ? 'text-[15px]' : 'bg-stone-50 text-[15px] text-stone-700'}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-stone-500">
              {words} tiếng{editing && ' · Ctrl + Enter để nộp'}
            </span>
            {editing ? (
              <Button variant="dark" onClick={() => grade.mutate()} disabled={words === 0 || unchanged} loading={grade.isPending}>
                {grade.isPending ? 'Đang chấm…' : attempts.length ? 'Nộp lại' : 'Nộp bài'}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Sửa bài
                </Button>
                <Button variant="dark" onClick={onNext} loading={nextLoading}>
                  Câu tiếp theo
                </Button>
              </div>
            )}
          </div>
          {grade.error && (
            <div className="mt-3">
              <ErrorMessage error={grade.error} />
            </div>
          )}
        </div>

        {attempts.length > 0 && (
          <div className="mt-8 space-y-6">
            <AttemptHistory attempts={attempts} selected={selected} onSelect={setSelected} />

            <div className="border-t border-stone-200 pt-5">
              {showReference ? (
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Giải nghĩa chuẩn <span className="font-normal text-stone-500">· VIVID #{idiom.id}</span>
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-stone-700">{idiom.explanation}</p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <Link to={`/idioms/${idiom.id}`} className="font-medium text-brand-700 hover:underline">
                      Xem mục từ
                    </Link>
                    <button onClick={() => save.mutate()} disabled={save.isPending || save.isSuccess} className="font-medium text-brand-700 hover:underline disabled:text-stone-400 disabled:no-underline">
                      {save.isSuccess ? 'Đã lưu vào bộ thẻ' : 'Lưu vào bộ thẻ'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-stone-500">Sửa bài theo góp ý rồi nộp lại trước khi xem đáp án.</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowReference(true)}>
                    Xem giải nghĩa chuẩn
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-8 lg:border-l lg:border-stone-200 lg:pl-8">
        {grade.isPending ? (
          <p className="text-sm text-stone-500">Đang chấm theo 4 tiêu chí…</p>
        ) : current ? (
          <FeedbackPanel key={current.id} result={current} />
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Bài được chấm thế nào</h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Bài được so với giải nghĩa chuẩn của VIVID và chấm 0–5 theo 4 tiêu chí của bài báo: ý nghĩa cốt lõi, sắc thái và ẩn ý, diễn
              đạt, độ đầy đủ. Nếu ý nghĩa cốt lõi sai hoàn toàn thì điểm tổng là 0.
            </p>
          </div>
        )}
        <HintLadder key={idiom.id} idiomId={idiom.id} />
      </aside>
    </div>
  )
}
