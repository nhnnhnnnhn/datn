import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PartyPopper, RotateCcw } from 'lucide-react'
import type { Flashcard, ReviewRating } from '@/types'
import { api } from '@/api'
import { Card } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/Button'
import { EmptyState, ErrorMessage, ProgressBar, Spinner } from '@/components/ui/Feedback'
import { IdiomBadges } from '@/components/idiom/IdiomBadges'
import { KINDS } from '@/lib/constants'
import { formatInterval, isNewCard, schedule } from '@/lib/srs'
import { cn } from '@/lib/cn'
import { createLogger } from '@/lib/logger'

const log = createLogger('FLASHCARD')
const srsLog = createLogger('SRS')

const RATINGS: { rating: ReviewRating; label: string; key: string; className: string }[] = [
  { rating: 'again', label: 'Học lại', key: '1', className: 'border-brand-200 text-brand-700 hover:bg-brand-50' },
  { rating: 'hard', label: 'Khó', key: '2', className: 'border-gold-200 text-gold-700 hover:bg-gold-50' },
  { rating: 'good', label: 'Nhớ', key: '3', className: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  { rating: 'easy', label: 'Dễ', key: '4', className: 'border-sky-200 text-sky-700 hover:bg-sky-50' },
]

export default function FlashcardStudy() {
  const { deckId = '' } = useParams()
  const deck = useQuery({ queryKey: ['deck', deckId], queryFn: () => api.flashcards.deck(deckId), meta: { tag: 'FLASHCARD' } })
  const queue = useQuery({
    queryKey: ['study', deckId],
    queryFn: () => api.flashcards.studyQueue(deckId),
    staleTime: Infinity,
    gcTime: 0,
    meta: { tag: 'FLASHCARD' },
  })

  if (deck.error || queue.error) return <ErrorMessage error={deck.error ?? queue.error} />
  if (!deck.data || !queue.data) return <Spinner />

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/flashcards" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-semibold text-stone-900">{deck.data.name}</h1>
          <p className="text-xs text-stone-500">
            {deck.data.cardCount} thẻ · {deck.data.learnedCount} đã thuộc
          </p>
        </div>
      </div>
      {queue.data.length === 0 ? <DeckOverview deckId={deckId} /> : <StudySession initial={queue.data} />}
    </div>
  )
}

function StudySession({ initial }: { initial: Flashcard[] }) {
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState(initial)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const [againCount, setAgainCount] = useState(0)
  const card = queue[0]
  const total = done + queue.length
  const finished = !card

  useEffect(() => {
    if (finished) log.info('finished study session', { reviewed: done, again: againCount })
  }, [finished, done, againCount])

  const review = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: ReviewRating }) => api.flashcards.review(id, rating),
    meta: { tag: 'FLASHCARD' },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      queryClient.invalidateQueries({ queryKey: ['deck'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })

  const rate = useCallback(
    (rating: ReviewRating) => {
      if (!card || !flipped) return
      srsLog.debug('rated card', { cardId: card.id, rating, nextIntervalDays: schedule(card.srs, rating).interval })
      review.mutate({ id: card.id, rating })
      setFlipped(false)
      if (rating === 'again') {
        // "again" cards go back to the end of this session's queue
        setAgainCount((n) => n + 1)
        setQueue((q) => [...q.slice(1), { ...q[0], srs: schedule(q[0].srs, 'again') }])
      } else {
        setDone((n) => n + 1)
        setQueue((q) => q.slice(1))
      }
    },
    [card, flipped, review],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else {
        const r = RATINGS.find((x) => x.key === e.key)
        if (r) rate(r.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rate])

  if (!card) {
    return (
      <Card className="mx-auto max-w-lg p-10 text-center">
        <PartyPopper className="mx-auto size-10 text-gold-500" />
        <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-900">Hoàn thành phiên ôn tập!</h2>
        <p className="mt-2 text-stone-500">
          Bạn đã ôn {done} thẻ{againCount > 0 && `, trong đó ${againCount} lần phải học lại`}.
        </p>
        <Link to="/flashcards" className={buttonClass('primary', 'md', 'mt-6')}>
          Về danh sách bộ thẻ
        </Link>
      </Card>
    )
  }

  const { idiom } = card

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3 text-sm text-stone-500">
        <ProgressBar value={done / total} className="h-2 flex-1" barClassName="bg-emerald-500" />
        <span className="tabular-nums">
          {done}/{total}
        </span>
      </div>

      <div className="flip-scene">
        <div
          className={cn('flip-card relative h-[22rem] cursor-pointer sm:h-[24rem]', flipped && 'is-flipped')}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          aria-label={flipped ? 'Mặt sau thẻ, bấm để lật lại' : 'Mặt trước thẻ, bấm để xem nghĩa'}
        >
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <span className="text-xs font-semibold tracking-wider text-gold-700 uppercase">
              {KINDS[idiom.kind]}
              {isNewCard(card.srs) && ' · Thẻ mới'}
            </span>
            <p className="mt-4 font-serif text-3xl leading-snug font-semibold text-stone-900">{idiom.phrase}</p>
            <p className="mt-8 text-sm text-stone-400">Nhớ nghĩa của câu này chưa? Bấm hoặc nhấn Space để lật thẻ</p>
          </div>
          <div className="flip-face flip-back absolute inset-0 flex flex-col overflow-y-auto rounded-3xl border border-brand-200 bg-gradient-to-b from-brand-50/60 to-white p-6 shadow-sm sm:p-8">
            <p className="font-serif text-xl font-semibold text-brand-800">{idiom.phrase}</p>
            <div className="mt-3">
              <IdiomBadges idiom={idiom} short />
            </div>
            <p className="mt-4 leading-relaxed text-stone-700">{idiom.explanation}</p>
            {idiom.glossary && (
              <ul className="mt-3 space-y-0.5 text-sm text-stone-500">
                {idiom.glossary.map((g) => (
                  <li key={g.term}>
                    <b className="text-stone-700">{g.term}</b>: {g.meaning}
                  </li>
                ))}
              </ul>
            )}
            {idiom.example && <p className="mt-3 text-sm text-stone-500 italic">VD: {idiom.example}</p>}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {RATINGS.map(({ rating, label, className }) => (
          <button
            key={rating}
            onClick={() => rate(rating)}
            disabled={!flipped}
            className={cn(
              'flex flex-col items-center rounded-xl border bg-white py-2.5 transition disabled:cursor-not-allowed disabled:opacity-40',
              className,
            )}
          >
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[11px] opacity-70">{formatInterval(schedule(card.srs, rating).interval)}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 hidden text-center text-xs text-stone-400 sm:block">
        Phím tắt: Space lật thẻ · 1–4 chọn mức độ nhớ
      </p>
    </div>
  )
}

function DeckOverview({ deckId }: { deckId: string }) {
  const cards = useQuery({ queryKey: ['cards', deckId], queryFn: () => api.flashcards.cards(deckId), meta: { tag: 'FLASHCARD' } })
  if (!cards.data) return <Spinner />
  const sorted = [...cards.data].sort((a, b) => a.srs.due.localeCompare(b.srs.due))
  return (
    <div className="space-y-4">
      <Card>
        <EmptyState
          icon={<RotateCcw className="size-6" />}
          title="Không có thẻ nào cần ôn lúc này"
          description="Bạn đã ôn hết thẻ đến hạn. Hãy quay lại sau hoặc chọn bộ thẻ khác."
          action={
            <Link to="/flashcards" className={buttonClass('outline')}>
              Chọn bộ thẻ khác
            </Link>
          }
        />
      </Card>
      <Card className="divide-y divide-stone-100">
        {sorted.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-3">
            <Link to={`/idioms/${c.idiomId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 hover:text-brand-700">
              {c.idiom.phrase}
            </Link>
            <span className="text-xs text-stone-500">
              Ôn lại {new Date(c.srs.due).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
