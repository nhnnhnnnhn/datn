import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { QuestionType } from '@/types'
import { api } from '@/api'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { LessonPlayer } from '@/components/lesson/LessonPlayer'

export function DeckLesson({ deckId, types, typing = false }: { deckId: string; types: QuestionType[]; typing?: boolean }) {
  const navigate = useNavigate()
  const quiz = useQuery({
    queryKey: ['lesson', deckId, types.join(',')],
    queryFn: () => api.quizzes.generate({ count: 10, types, deckId }),
    staleTime: Infinity,
    gcTime: 0,
    meta: { tag: 'QUIZ' },
  })
  const exit = () => navigate(`/sets/${deckId}`)

  if (quiz.error) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24">
        <ErrorMessage error={quiz.error} />
      </div>
    )
  }
  if (!quiz.data) return <Spinner label="Đang tạo bài học…" className="min-h-dvh" />
  return <LessonPlayer quiz={quiz.data} typing={typing} onExit={exit} />
}
