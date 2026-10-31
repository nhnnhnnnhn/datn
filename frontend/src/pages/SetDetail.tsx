import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, ListChecks, PencilLine, Puzzle } from 'lucide-react'
import type { Flashcard } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { isDue, isLearned, isNewCard } from '@/lib/srs'
import { createLogger } from '@/lib/logger'
import { firstSentence } from '@/lib/text'

const log = createLogger('FLASHCARD')

const MODES = [
  { path: 'flashcards', label: 'Thẻ ghi nhớ', text: 'Lật thẻ, tự đánh giá mức nhớ', icon: Layers },
  { path: 'learn', label: 'Trắc nghiệm', text: 'Chọn nghĩa, chọn câu, điền từ', icon: ListChecks },
  { path: 'match', label: 'Nối cặp', text: 'Ghép câu với nghĩa, tính giờ', icon: Puzzle },
  { path: 'write', label: 'Điền từ', text: 'Tự gõ từ còn thiếu trong câu', icon: PencilLine },
]

function cardStatus(card: Flashcard): string {
  if (isNewCard(card.srs)) return 'Mới'
  if (isDue(card.srs)) return 'Cần ôn'
  const next = new Date(card.srs.due).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
  return `${isLearned(card.srs) ? 'Đã thuộc' : 'Đang học'} · ôn lại ${next}`
}

export default function SetDetail() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deck = useQuery({ queryKey: ['deck', deckId], queryFn: () => api.flashcards.deck(deckId), meta: { tag: 'FLASHCARD' } })
  const cards = useQuery({ queryKey: ['cards', deckId], queryFn: () => api.flashcards.cards(deckId), meta: { tag: 'FLASHCARD' } })
  const remove = useMutation({
    mutationFn: () => api.flashcards.deleteDeck(deckId),
    meta: { tag: 'FLASHCARD' },
    onSuccess: () => {
      log.info('deleted deck', { deckId })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      navigate('/sets')
    },
  })

  if (deck.error) return <ErrorMessage error={deck.error} />
  if (!deck.data) return <Spinner />
  const d = deck.data
  const empty = d.cardCount === 0

  return (
    <div>
      <Link to="/sets" className="text-sm text-stone-500 hover:text-stone-800">
        ← Bộ thẻ
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{d.name}</h1>
          <p className="mt-1 text-[15px] text-stone-500">
            {d.cardCount} thẻ · {d.dueCount} cần ôn · {d.newCount} mới · {d.learnedCount} đã thuộc
          </p>
          <p className="mt-0.5 text-sm text-stone-500">{d.description}</p>
        </div>
        {d.source === 'ai' && (
          <Button variant="danger" size="sm" loading={remove.isPending} onClick={() => confirm(`Xoá bộ thẻ “${d.name}”?`) && remove.mutate()}>
            Xoá bộ thẻ
          </Button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MODES.map(({ path, label, text, icon: Icon }) =>
          empty ? (
            <div key={path} className="rounded-lg border border-stone-200 p-4 opacity-50">
              <Icon className="size-5 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-900">{label}</p>
            </div>
          ) : (
            <Link key={path} to={`/sets/${deckId}/${path}`} className="rounded-lg border border-stone-200 p-4 transition-colors hover:border-stone-400 hover:bg-stone-50">
              <Icon className="size-5 text-stone-600" />
              <p className="mt-2 text-sm font-semibold text-stone-900">{label}</p>
              <p className="mt-0.5 text-xs text-stone-500">{text}</p>
            </Link>
          ),
        )}
      </div>

      <section className="mt-10">
        <h2 className="border-b border-stone-200 pb-2 text-base font-semibold text-stone-900">
          Thẻ trong bộ <span className="font-normal text-stone-500">— {d.cardCount}</span>
        </h2>
        {empty ? (
          <p className="py-8 text-center text-sm text-stone-500">
            Bộ thẻ trống. Lưu câu từ{' '}
            <Link to="/idioms" className="text-brand-700 hover:underline">
              kho tra cứu
            </Link>{' '}
            để thêm thẻ.
          </p>
        ) : !cards.data ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-stone-100">
            {cards.data.map((c) => (
              <li key={c.id} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr_10rem]">
                <Link to={`/idioms/${c.idiomId}`} className="font-serif text-[17px] font-semibold text-stone-900 hover:text-brand-700">
                  {c.idiom.phrase}
                </Link>
                <p className="text-sm text-stone-700">{firstSentence(c.idiom.explanation)}</p>
                <p className="text-xs text-stone-500 sm:text-right">{cardStatus(c)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
