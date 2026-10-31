import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QuestionType, Quiz as QuizT, QuizConfig, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { PageHeader, Section } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Select } from '@/components/ui/Field'
import { EmptyState, ErrorMessage } from '@/components/ui/Feedback'
import { LessonPlayer } from '@/components/lesson/LessonPlayer'
import { QUESTION_TYPES, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { formatRelative } from '@/lib/text'

const ALL_TYPES = Object.keys(QUESTION_TYPES) as QuestionType[]
const log = createLogger('QUIZ')

export default function Quiz() {
  const queryClient = useQueryClient()
  const [playing, setPlaying] = useState<QuizT | null>(null)
  const [count, setCount] = useState(10)
  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES)
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>('')
  const history = useQuery({ queryKey: ['quizzes', 'history'], queryFn: () => api.quizzes.history(8), meta: { tag: 'QUIZ' } })

  const generate = useMutation({
    mutationFn: (config: QuizConfig) => api.quizzes.generate(config),
    meta: { tag: 'QUIZ' },
    onSuccess: (quiz) => {
      log.info('generated quiz', { quizId: quiz.id, questions: quiz.questions.length, types: quiz.config.types })
      setPlaying(quiz)
    },
  })

  const toggleType = (t: QuestionType) =>
    setTypes((prev) => (prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]))

  if (playing) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
        <LessonPlayer
          quiz={playing}
          onExit={() => {
            setPlaying(null)
            queryClient.invalidateQueries({ queryKey: ['quizzes'] })
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Tạo bài trắc nghiệm" description="Hệ thống tự sinh câu hỏi từ kho theo cấu hình bên dưới." />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="max-w-xl space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            generate.mutate({ count, types, topic: topic || undefined, trait: trait || undefined })
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-700">Dạng câu hỏi</legend>
            <div className="space-y-2">
              {ALL_TYPES.map((t) => (
                <label key={t} className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="mt-0.5 accent-stone-900" />
                  <span>
                    <span className="font-medium text-stone-900">{QUESTION_TYPES[t].label}</span>
                    <span className="text-stone-500"> — {QUESTION_TYPES[t].description.toLowerCase()}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="quiz-count">Số câu</Label>
              <Select id="quiz-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} câu
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="quiz-topic">Chủ đề</Label>
              <Select id="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')}>
                <option value="">Tất cả</option>
                {TOPIC_IDS.map((t) => (
                  <option key={t} value={t}>
                    {TOPICS[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="quiz-trait">Đặc trưng</Label>
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
          <Button type="submit" variant="dark" size="lg" loading={generate.isPending}>
            Bắt đầu
          </Button>
        </form>

        <Section title="Lần làm gần đây">
          {history.data?.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {history.data.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between py-2">
                  <span className="text-stone-800">
                    Đúng {r.correct}/{r.total} câu
                  </span>
                  <span className="text-xs text-stone-500">{formatRelative(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Chưa làm bài nào" />
          )}
        </Section>
      </div>
    </div>
  )
}
