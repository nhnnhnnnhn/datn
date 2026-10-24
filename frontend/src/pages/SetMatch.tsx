import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { Flashcard } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { FocusHeader } from '@/components/lesson/FocusHeader'
import { createLogger } from '@/lib/logger'
import { firstSentence } from '@/lib/text'
import { cn } from '@/lib/cn'

const log = createLogger('FLASHCARD')
const PAIRS = 6

interface Tile {
  key: string
  cardId: string
  text: string
  side: 'phrase' | 'meaning'
}

function buildTiles(cards: Flashcard[]): Tile[] {
  const picked = [...cards].sort(() => Math.random() - 0.5).slice(0, PAIRS)
  const tiles = picked.flatMap((c) => [
    { key: `${c.id}-p`, cardId: c.id, text: c.idiom.phrase, side: 'phrase' as const },
    { key: `${c.id}-m`, cardId: c.id, text: firstSentence(c.idiom.explanation), side: 'meaning' as const },
  ])
  return tiles.sort(() => Math.random() - 0.5)
}

export default function SetMatch() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const cards = useQuery({ queryKey: ['cards', deckId], queryFn: () => api.flashcards.cards(deckId), meta: { tag: 'FLASHCARD' } })
  const [tiles, setTiles] = useState<Tile[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Tile | null>(null)
  const [miss, setMiss] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const pairCount = tiles.length / 2
  const done = pairCount > 0 && matched.size === pairCount
  const logged = useRef(false)

  useEffect(() => {
    if (cards.data) setTiles(buildTiles(cards.data))
  }, [cards.data])

  useEffect(() => {
    if (done) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 100) / 10), 100)
    return () => clearInterval(t)
  }, [done, startedAt])

  useEffect(() => {
    if (done && !logged.current) {
      logged.current = true
      log.info('finished match', { deckId, seconds: elapsed, mistakes })
    }
  }, [done, deckId, elapsed, mistakes])

  function pick(tile: Tile) {
    if (matched.has(tile.cardId) || miss.length) return
    if (!selected) return setSelected(tile)
    if (selected.key === tile.key) return setSelected(null)
    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      setMatched((m) => new Set(m).add(tile.cardId))
      setSelected(null)
      return
    }
    setMistakes((n) => n + 1)
    setMiss([selected.key, tile.key])
    setSelected(null)
    setTimeout(() => setMiss([]), 500)
  }

  function restart() {
    if (cards.data) setTiles(buildTiles(cards.data))
    setMatched(new Set())
    setSelected(null)
    setMistakes(0)
    setStartedAt(Date.now())
    setElapsed(0)
    logged.current = false
  }

  const exit = () => navigate(`/sets/${deckId}`)
  if (cards.error) return <ErrorMessage error={cards.error} />
  if (!cards.data) return <Spinner className="min-h-dvh" />

  return (
    <div className="min-h-dvh bg-white">
      <FocusHeader progress={pairCount ? matched.size / pairCount : 0} label={`${elapsed.toFixed(1)}s`} onExit={exit} />
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-12">
        {done ? (
          <div className="pt-8">
            <h1 className="text-2xl font-bold text-stone-900">Hoàn thành trong {elapsed.toFixed(1)} giây</h1>
            <p className="mt-2 text-stone-600">{mistakes === 0 ? 'Không ghép sai lần nào.' : `Ghép sai ${mistakes} lần.`}</p>
            <div className="mt-8 flex gap-2">
              <Button variant="dark" size="lg" onClick={restart}>
                Chơi lại
              </Button>
              <Button variant="outline" size="lg" onClick={exit}>
                Về bộ thẻ
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-stone-600">Chọn một câu và lời giải nghĩa tương ứng để ghép cặp.</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {tiles.map((tile) => {
                const isMatched = matched.has(tile.cardId)
                return (
                  <button
                    key={tile.key}
                    onClick={() => pick(tile)}
                    disabled={isMatched}
                    className={cn(
                      'min-h-24 rounded-lg border-2 p-3 text-left text-sm leading-snug transition-all',
                      isMatched && 'invisible',
                      tile.side === 'phrase' && 'font-serif text-[15px] font-semibold',
                      miss.includes(tile.key)
                        ? 'border-wrong bg-wrong-bg'
                        : selected?.key === tile.key
                          ? 'border-stone-900 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-400',
                    )}
                  >
                    {tile.text}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
