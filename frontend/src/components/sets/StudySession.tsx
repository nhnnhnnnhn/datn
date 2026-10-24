import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Flashcard, ReviewRating } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { IdiomTags } from '@/components/idiom/IdiomTags'
import { FocusHeader } from '@/components/lesson/FocusHeader'
import { createLogger } from '@/lib/logger'
import { formatInterval, isNewCard, schedule } from '@/lib/srs'
import { cn } from '@/lib/cn'

const log = createLogger('FLASHCARD')
const srsLog = createLogger('SRS')

const RATINGS: { rating: ReviewRating; label: string; key: string; className: string }[] = [
  { rating: 'again', label: 'Học lại', key: '1', className: 'text-red-700' },
  { rating: 'hard', label: 'Khó', key: '2', className: 'text-stone-700' },
  { rating: 'good', label: 'Nhớ', key: '3', className: 'text-emerald-700' },
  { rating: 'easy', label: 'Dễ', key: '4', className: 'text-sky-700' },
]

export function StudySession({ initial, deckName, onExit }: { initial: Flashcard[]; deckName: string; onExit: () => void }) {
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState(initial)
  const [revealed, setRevealed] = useState(false)
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
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })

  const rate = useCallback(
    (rating: ReviewRating) => {
      if (!card || !revealed) return
      srsLog.debug('rated card', { cardId: card.id, rating, nextIntervalDays: schedule(card.srs, rating).interval })
      review.mutate({ id: card.id, rating })
      setRevealed(false)
      if (rating === 'again') {
        // "again" cards go back to the end of this session's queue
        setAgainCount((n) => n + 1)
        setQueue((q) => [...q.slice(1), { ...q[0], srs: schedule(q[0].srs, 'again') }])
      } else {
        setDone((n) => n + 1)
        setQueue((q) => q.slice(1))
      }
    },
    [card, revealed, review],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setRevealed(true)
      } else {
        const r = RATINGS.find((x) => x.key === e.key)
        if (r) rate(r.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rate])

  if (finished) {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <FocusHeader progress={1} onExit={onExit} />
        <main className="mx-auto w-full max-w-xl px-4 pt-16">
          <h1 className="text-2xl font-bold text-stone-900">Xong phần ôn hôm nay</h1>
          <p className="mt-2 text-stone-600">
            Đã ôn {done} thẻ trong “{deckName}”{againCount > 0 && `, ${againCount} lần chọn Học lại`}. Thẻ sẽ quay lại theo lịch ôn.
          </p>
          <Button variant="dark" size="lg" className="mt-8" onClick={onExit}>
            Về bộ thẻ
          </Button>
        </main>
      </div>
    )
  }

  const { idiom } = card

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <FocusHeader progress={done / total} label={`${done}/${total}`} onExit={onExit} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-10 pb-6">
        <div className="flip-scene">
          <div className={cn('flip-card relative h-80', revealed && 'is-flipped')}>
            <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-stone-300 bg-white p-8 text-center">
              <span className="text-xs text-stone-500">
                VIVID #{idiom.id}
                {isNewCard(card.srs) && ' · thẻ mới'}
              </span>
              <p className="mt-3 font-serif text-3xl leading-snug font-semibold text-stone-900">{idiom.phrase}</p>
            </div>
            <div className="flip-face flip-back absolute inset-0 overflow-y-auto rounded-lg border border-stone-300 bg-white p-6">
              <p className="font-serif text-xl font-semibold text-stone-900">{idiom.phrase}</p>
              <div className="mt-2">
                <IdiomTags idiom={idiom} />
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-stone-800">{idiom.explanation}</p>
              {idiom.glossary && (
                <ul className="mt-3 space-y-0.5 text-sm text-stone-600">
                  {idiom.glossary.map((g) => (
                    <li key={g.term}>
                      <span className="font-medium text-stone-800">{g.term}</span>: {g.meaning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {revealed ? (
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map(({ rating, label, key, className }) => (
                <button key={rating} onClick={() => rate(rating)} className="rounded-md border border-stone-300 py-2 hover:bg-stone-50">
                  <span className="block text-xs text-stone-500">{formatInterval(schedule(card.srs, rating).interval)}</span>
                  <span className={cn('block text-sm font-semibold', className)}>{label}</span>
                  <span className="hidden text-[10px] text-stone-400 sm:block">phím {key}</span>
                </button>
              ))}
            </div>
          ) : (
            <Button variant="dark" size="lg" className="w-full" onClick={() => setRevealed(true)}>
              Hiện đáp án
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
