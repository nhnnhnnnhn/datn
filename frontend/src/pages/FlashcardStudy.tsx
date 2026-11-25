import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { buttonClass } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { StudySession } from '@/components/sets/StudySession'

export default function FlashcardStudy() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const deck = useQuery({ queryKey: ['deck', deckId], queryFn: () => api.flashcards.deck(deckId), meta: { tag: 'FLASHCARD' } })
  const queue = useQuery({
    queryKey: ['study', deckId],
    queryFn: () => api.flashcards.studyQueue(deckId),
    staleTime: Infinity,
    gcTime: 0,
    meta: { tag: 'FLASHCARD' },
  })

  if (deck.error || queue.error) {
    return (
      <div className="p-6">
        <ErrorMessage error={deck.error ?? queue.error} />
      </div>
    )
  }
  if (!deck.data || !queue.data) return <Spinner className="min-h-dvh" />

  if (queue.data.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24">
        <h1 className="text-2xl font-bold text-stone-900">Không có thẻ nào đến hạn</h1>
        <p className="mt-2 text-stone-600">Bạn đã ôn hết thẻ của “{deck.data.name}”. Thử chế độ trắc nghiệm hoặc nối cặp để luyện thêm.</p>
        <Link to={`/sets/${deckId}`} className={buttonClass('dark', 'lg', 'mt-8')}>
          Về bộ thẻ
        </Link>
      </div>
    )
  }

  return <StudySession initial={queue.data} deckName={deck.data.name} onExit={() => navigate(`/sets/${deckId}`)} />
}
