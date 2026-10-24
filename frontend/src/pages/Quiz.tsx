import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, CircleCheck, CircleX, Clock, ListChecks, RotateCcw, WandSparkles, X } from 'lucide-react'
import type { QuestionType, Quiz as QuizT, QuizAnswer, QuizConfig, QuizResult, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { Label, Select } from '@/components/ui/Field'
import { EmptyState, ErrorMessage, ProgressBar } from '@/components/ui/Feedback'
import { QUESTION_TYPES, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { formatRelative } from '@/lib/text'
import { cn } from '@/lib/cn'
import { createLogger } from '@/lib/logger'

const ALL_TYPES = Object.keys(QUESTION_TYPES) as QuestionType[]
const LETTERS = ['A', 'B', 'C', 'D']
const log = createLogger('QUIZ')

type Phase = { name: 'setup' } | { name: 'play'; quiz: QuizT } | { name: 'result'; quiz: QuizT; answers: QuizAnswer[]; result: QuizResult }

export default function Quiz() {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })

  return (
    <div className="animate-fade-in">
      {phase.name === 'setup' && <QuizSetup onStart={(quiz) => setPhase({ name: 'play', quiz })} />}
      {phase.name === 'play' && (
        <QuizPlay
          quiz={phase.quiz}
          onQuit={() => setPhase({ name: 'setup' })}
          onFinish={(answers, result) => setPhase({ name: 'result', quiz: phase.quiz, answers, result })}
        />
      )}
      {phase.name === 'result' && <QuizReview {...phase} onRestart={() => setPhase({ name: 'setup' })} />}
    </div>
  )
}

function QuizSetup({ onStart }: { onStart: (quiz: QuizT) => void }) {
  const [count, setCount] = useState(10)
  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES)
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>('')
  const history = useQuery({ queryKey: ['quizzes', 'history'], queryFn: () => api.quizzes.history(6), meta: { tag: 'QUIZ' } })

  const generate = useMutation({
    mutationFn: (config: QuizConfig) => api.quizzes.generate(config),
    meta: { tag: 'QUIZ' },
    onSuccess: (quiz) => {
      log.info('generated quiz', { quizId: quiz.id, questions: quiz.questions.length, types: quiz.config.types })
      onStart(quiz)
    },
  })

  const toggleType = (t: QuestionType) =>
    setTypes((prev) => (prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]))

  return (
    <>
      <PageHeader title="Quiz" description="Hệ thống tự động sinh câu hỏi trắc nghiệm từ kho thành ngữ theo cấu hình bạn chọn." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <div className="space-y-6">
            <div>
              <Label>Số câu hỏi</Label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={cn(
                      'rounded-xl border py-2.5 text-sm font-medium transition',
                      count === n ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    )}
                  >
                    {n} câu
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Dạng câu hỏi</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_TYPES.map((t) => {
                  const on = types.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                        on ? 'border-brand-500 bg-brand-50/50' : 'border-stone-200 hover:border-stone-300',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300',
                        )}
                      >
                        {on && <Check className="size-3" />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-stone-800">{QUESTION_TYPES[t].label}</span>
                        <span className="block text-xs text-stone-500">{QUESTION_TYPES[t].description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="quiz-topic">Chủ đề</Label>
                <Select id="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')}>
                  <option value="">Tất cả chủ đề</option>
                  {TOPIC_IDS.map((t) => (
                    <option key={t} value={t}>
                      {TOPICS[t].label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="quiz-trait">Đặc trưng ngôn ngữ</Label>
                <Select id="quiz-trait" value={trait} onChange={(e) => setTrait(e.target.value as TraitId | '')}>
                  <option value="">Tất cả</option>
                  {TRAIT_IDS.map((t) => (
                    <option key={t} value={t}>
                      {TRAITS[t].label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {generate.error && <ErrorMessage error={generate.error} />}

            <Button
              size="lg"
              className="w-full"
              loading={generate.isPending}
              onClick={() => generate.mutate({ count, types, topic: topic || undefined, trait: trait || undefined })}
            >
              <WandSparkles className="size-4" /> {generate.isPending ? 'Đang tạo đề…' : 'Tạo đề và bắt đầu'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Lịch sử làm bài" />
          <div className="p-2">
            {history.data?.length ? (
              history.data.map((r) => {
                const pct = r.correct / r.total
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                        pct >= 0.8 ? 'bg-emerald-50 text-emerald-700' : pct >= 0.5 ? 'bg-gold-50 text-gold-700' : 'bg-brand-50 text-brand-700',
                      )}
                    >
                      {Math.round(pct * 100)}%
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-800">
                        Đúng {r.correct}/{r.total} câu
                      </span>
                      <span className="block text-xs text-stone-500">
                        {formatRelative(r.createdAt)} · {Math.round(r.durationSec / 60)} phút
                      </span>
                    </span>
                  </div>
                )
              })
            ) : (
              <EmptyState icon={<ListChecks className="size-6" />} title="Chưa làm bài nào" />
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

function useElapsed() {
  const start = useRef(Date.now())
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSec(Math.floor((Date.now() - start.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  return sec
}

function QuizPlay({ quiz, onQuit, onFinish }: { quiz: QuizT; onQuit: () => void; onFinish: (a: QuizAnswer[], r: QuizResult) => void }) {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const elapsed = useElapsed()
  const q = quiz.questions[index]
  const selected = answers.find((a) => a.questionId === q.id)?.selectedIndex ?? null
  const answered = selected !== null
  const isLast = index === quiz.questions.length - 1

  const submit = useMutation({
    mutationFn: () => api.quizzes.submit(quiz.id, answers, elapsed),
    meta: { tag: 'QUIZ' },
    onSuccess: (result) => {
      log.info('submitted quiz', { quizId: quiz.id, correct: result.correct, total: result.total, durationSec: result.durationSec })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      onFinish(answers, result)
    },
  })

  const choose = useCallback(
    (i: number) => {
      if (answered) return
      setAnswers((prev) => [...prev, { questionId: q.id, selectedIndex: i }])
    },
    [answered, q.id],
  )

  const advance = useCallback(() => {
    if (!answered) return
    if (isLast) submit.mutate()
    else setIndex((i) => i + 1)
  }, [answered, isLast, submit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= String(q.options.length)) choose(Number(e.key) - 1)
      else if (e.key === 'Enter') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, advance, q.options.length])

  const correctSoFar = answers.filter((a) => quiz.questions.find((x) => x.id === a.questionId)?.answerIndex === a.selectedIndex).length

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-4">
        <button onClick={onQuit} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Thoát">
          <X className="size-5" />
        </button>
        <ProgressBar value={(index + (answered ? 1 : 0)) / quiz.questions.length} className="h-2.5 flex-1" />
        <span className="flex items-center gap-1 text-sm text-stone-500 tabular-nums">
          <Clock className="size-4" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-stone-500">
          Câu {index + 1}/{quiz.questions.length} · {QUESTION_TYPES[q.type].label}
        </span>
        <span className="text-stone-500">
          Đúng: <b className="text-emerald-600">{correctSoFar}</b>
        </span>
      </div>

      <Card key={q.id} className="animate-fade-in p-6 sm:p-8">
        <p className="text-stone-600">{q.prompt}</p>
        {q.highlight && (
          <p className={cn('mt-3 leading-snug font-semibold text-stone-900', q.type === 'reverse' ? 'text-lg' : 'font-serif text-2xl')}>
            “{q.highlight}”
          </p>
        )}

        <div className="mt-6 space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.answerIndex
            const isChosen = i === selected
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition',
                  !answered && 'border-stone-200 hover:border-brand-300 hover:bg-brand-50/40',
                  answered && isCorrect && 'border-emerald-500 bg-emerald-50',
                  answered && isChosen && !isCorrect && 'border-brand-500 bg-brand-50',
                  answered && !isCorrect && !isChosen && 'border-stone-200 opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                    answered && isCorrect ? 'bg-emerald-500 text-white' : answered && isChosen ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600',
                  )}
                >
                  {answered && isCorrect ? <Check className="size-3.5" /> : answered && isChosen ? <X className="size-3.5" /> : LETTERS[i]}
                </span>
                <span className="pt-0.5 leading-relaxed text-stone-800">{opt}</span>
              </button>
            )
          })}
        </div>

        {answered && (
          <div className={cn('mt-5 animate-fade-in rounded-xl p-4 text-sm', selected === q.answerIndex ? 'bg-emerald-50 text-emerald-900' : 'bg-brand-50 text-brand-900')}>
            <div className="mb-1 font-semibold">{selected === q.answerIndex ? 'Chính xác!' : 'Chưa đúng'}</div>
            <p className="leading-relaxed opacity-90">{q.explanation}</p>
          </div>
        )}
      </Card>

      <div className="mt-5 flex justify-end">
        <Button size="lg" onClick={advance} disabled={!answered} loading={submit.isPending}>
          {isLast ? 'Nộp bài' : 'Câu tiếp theo'} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function QuizReview({ quiz, answers, result, onRestart }: { quiz: QuizT; answers: QuizAnswer[]; result: QuizResult; onRestart: () => void }) {
  const pct = result.correct / result.total
  const wrong = quiz.questions.filter((q) => answers.find((a) => a.questionId === q.id)?.selectedIndex !== q.answerIndex)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-8 text-center">
        <div className="text-sm font-medium text-stone-500">Kết quả</div>
        <div className="mt-2 font-serif text-5xl font-bold text-stone-900">
          {result.correct}
          <span className="text-2xl text-stone-400">/{result.total}</span>
        </div>
        <p className="mt-2 text-stone-600">
          {pct >= 0.8 ? 'Xuất sắc! Bạn nắm rất chắc.' : pct >= 0.5 ? 'Khá tốt, ôn thêm các câu sai nhé.' : 'Cần ôn tập thêm — đừng nản chí!'}
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Thời gian: {Math.floor(result.durationSec / 60)} phút {result.durationSec % 60} giây
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart}>
            <RotateCcw className="size-4" /> Làm đề mới
          </Button>
          {wrong.length > 0 && (
            <Link to={`/practice?idiom=${wrong[0].idiomId}`} className={buttonClass('outline')}>
              Luyện giải nghĩa câu sai
            </Link>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-stone-900">Xem lại bài làm</h2>
        <div className="space-y-3">
          {quiz.questions.map((q, i) => {
            const sel = answers.find((a) => a.questionId === q.id)?.selectedIndex
            const ok = sel === q.answerIndex
            return (
              <Card key={q.id} className="p-5">
                <div className="flex gap-3">
                  {ok ? <CircleCheck className="size-5 shrink-0 text-emerald-500" /> : <CircleX className="size-5 shrink-0 text-brand-500" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-stone-500">
                      Câu {i + 1}. {q.prompt}
                    </p>
                    {q.highlight && <p className="mt-1 font-medium text-stone-900">“{q.highlight}”</p>}
                    <p className="mt-2">
                      <span className="text-stone-500">Đáp án: </span>
                      <span className="font-medium text-emerald-700">{q.options[q.answerIndex]}</span>
                    </p>
                    {!ok && sel != null && (
                      <p>
                        <span className="text-stone-500">Bạn chọn: </span>
                        <span className="text-brand-700 line-through">{q.options[sel]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
