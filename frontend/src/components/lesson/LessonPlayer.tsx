import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Quiz, QuizAnswer, QuizResult } from '@/types'
import { api } from '@/api'
import { Input } from '@/components/ui/Field'
import { QUESTION_TYPES } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { normalize, sameAnswer } from '@/lib/text'
import { cn } from '@/lib/cn'
import { FocusHeader } from './FocusHeader'
import { FeedbackSheet, type SheetState } from './FeedbackSheet'
import { LessonSummary } from './LessonSummary'

const log = createLogger('QUIZ')

export function LessonPlayer({ quiz, typing = false, onExit }: { quiz: Quiz; typing?: boolean; onExit: () => void }) {
  const queryClient = useQueryClient()
  const started = useRef(Date.now())
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const q = quiz.questions[index]
  const isLast = index === quiz.questions.length - 1
  const multiple = q?.type === 'traits'

  const submit = useMutation({
    mutationFn: (all: QuizAnswer[]) => api.quizzes.submit(quiz.id, all, Math.round((Date.now() - started.current) / 1000)),
    meta: { tag: 'QUIZ' },
    onSuccess: (res) => {
      log.info('submitted quiz', { quizId: quiz.id, correct: res.correct, total: res.total, durationSec: res.durationSec })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      setResult(res)
    },
  })

  const correctText = q ? q.answer.map((i) => q.options[i]).join(', ') : ''
  const isCorrect = typing ? normalize(typed) === normalize(correctText) : sameAnswer(selected, q?.answer ?? [])
  const canCheck = typing ? typed.trim().length > 0 : selected.length > 0

  const choose = useCallback(
    (i: number) => {
      if (checked) return
      setSelected((prev) => (multiple ? (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]) : [i]))
    },
    [checked, multiple],
  )

  const check = useCallback(() => {
    if (checked || !canCheck) return
    setChecked(true)
    setAnswers((prev) => [...prev, { questionId: q.id, selected: typing ? (isCorrect ? q.answer : []) : selected }])
  }, [checked, canCheck, q, typing, isCorrect, selected])

  const advance = useCallback(() => {
    if (!checked) return
    if (isLast) {
      submit.mutate(answers)
      return
    }
    setIndex((i) => i + 1)
    setSelected([])
    setTyped('')
    setChecked(false)
  }, [checked, isLast, submit, answers])

  useEffect(() => {
    if (result) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return
      if (!typing && !checked && e.key >= '1' && e.key <= String(q.options.length)) choose(Number(e.key) - 1)
      else if (e.key === 'Enter') (checked ? advance : check)()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typing, checked, q, advance, check, choose, result])

  if (result) return <LessonSummary quiz={quiz} answers={answers} result={result} onExit={onExit} />

  const sheet: SheetState = !checked
    ? { kind: 'idle', canCheck }
    : isCorrect
      ? { kind: 'correct', explanation: q.explanation }
      : { kind: 'wrong', answer: correctText, explanation: q.explanation.includes(correctText) ? '' : q.explanation }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <FocusHeader progress={(index + (checked ? 1 : 0)) / quiz.questions.length} label={`${index + 1}/${quiz.questions.length}`} onExit={onExit} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-8">
        <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{QUESTION_TYPES[q.type].label}</p>
        <h1 className="mt-2 text-xl font-semibold text-stone-900">{q.prompt}</h1>
        {q.highlight && (
          <p className={cn('mt-4 leading-snug text-stone-900', q.type === 'reverse' ? 'text-lg' : 'font-serif text-2xl font-semibold')}>{q.highlight}</p>
        )}

        {typing ? (
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault()
              check()
            }}
          >
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={checked}
              autoFocus
              placeholder="Gõ từ còn thiếu (có dấu hoặc không dấu)"
              aria-label="Câu trả lời"
              className={cn('h-12 text-lg', checked && (isCorrect ? 'border-correct' : 'border-wrong'))}
            />
          </form>
        ) : (
          <ul className="mt-8 space-y-2.5">
            {q.options.map((opt, i) => {
              const chosen = selected.includes(i)
              const inAnswer = q.answer.includes(i)
              const showCorrect = checked && inAnswer
              const showWrong = checked && chosen && !inAnswer
              return (
                <li key={i}>
                  <button
                    onClick={() => choose(i)}
                    disabled={checked}
                    aria-pressed={chosen}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left text-[15px] leading-relaxed transition-colors',
                      showCorrect
                        ? 'border-correct bg-correct-bg'
                        : showWrong
                          ? 'border-wrong bg-wrong-bg'
                          : chosen
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-200 hover:bg-stone-50',
                      checked && !showCorrect && !showWrong && 'opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center border border-stone-300 text-xs text-stone-500',
                        multiple ? 'rounded-sm' : 'rounded',
                        multiple && chosen && 'border-stone-900 bg-stone-900 text-white',
                      )}
                    >
                      {multiple && chosen ? '✓' : i + 1}
                    </span>
                    <span className="text-stone-800">{opt}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <div className="sticky bottom-0">
        <FeedbackSheet state={sheet} onCheck={check} onContinue={advance} continueLabel={isLast ? 'Xem kết quả' : 'Tiếp tục'} />
      </div>
    </div>
  )
}
