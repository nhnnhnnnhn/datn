import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Layers, Sparkles, Trash2, WandSparkles, X } from 'lucide-react'
import type { Deck, DeckGenerateConfig, DeckSource, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Card, PageHeader } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { ErrorMessage, ProgressBar, Spinner } from '@/components/ui/Feedback'
import { Badge } from '@/components/ui/Badge'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { createLogger } from '@/lib/logger'

const log = createLogger('FLASHCARD')

const SOURCE: Record<DeckSource, { label: string; className: string }> = {
  saved: { label: 'Đã lưu', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ai: { label: 'AI tạo', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  topic: { label: 'Theo chủ đề', className: 'bg-stone-100 text-stone-600 ring-stone-200' },
}

export default function Flashcards() {
  const [showGenerator, setShowGenerator] = useState(false)
  const { data: decks, isLoading, error } = useQuery({ queryKey: ['decks'], queryFn: api.flashcards.decks, meta: { tag: 'FLASHCARD' } })

  const totalDue = decks?.reduce((s, d) => s + d.dueCount, 0) ?? 0
  const totalNew = decks?.reduce((s, d) => s + d.newCount, 0) ?? 0

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Flashcard"
        description="Ôn tập theo phương pháp lặp lại ngắt quãng: thẻ khó gặp lại sớm, thẻ đã thuộc giãn dần thời gian ôn."
        action={
          <Button onClick={() => setShowGenerator((v) => !v)}>
            <WandSparkles className="size-4" /> Tạo bộ thẻ bằng AI
          </Button>
        }
      />

      {showGenerator && <DeckGenerator onClose={() => setShowGenerator(false)} />}

      {decks && (
        <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-600">
          <span>
            <b className="text-brand-600">{totalDue}</b> thẻ đến hạn ôn
          </span>
          <span>
            <b className="text-stone-900">{totalNew}</b> thẻ mới
          </span>
          <span>
            <b className="text-stone-900">{decks.length}</b> bộ thẻ
          </span>
        </div>
      )}

      {error ? (
        <ErrorMessage error={error} />
      ) : isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks?.map((d) => <DeckCard key={d.id} deck={d} />)}
        </div>
      )}
    </div>
  )
}

function DeckCard({ deck }: { deck: Deck }) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => api.flashcards.deleteDeck(deck.id),
    meta: { tag: 'FLASHCARD' },
    onSuccess: () => {
      log.info('deleted deck', { deckId: deck.id })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
    },
  })
  const Icon = deck.source === 'saved' ? Bookmark : deck.source === 'ai' ? Sparkles : Layers
  const empty = deck.cardCount === 0

  return (
    <Card className="flex flex-col p-5" role="group" aria-label={deck.name}>
      <div className="flex items-start gap-3">
        <span
          className={cn('rounded-xl p-2.5', deck.source === 'topic' && deck.topic ? '' : 'bg-stone-100 text-stone-600')}
          style={deck.source === 'topic' && deck.topic ? { backgroundColor: `${TOPICS[deck.topic].color}14`, color: TOPICS[deck.topic].color } : undefined}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-stone-900">{deck.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{deck.description}</p>
        </div>
        {deck.source === 'ai' && (
          <button
            onClick={() => confirm(`Xoá bộ thẻ “${deck.name}”?`) && remove.mutate()}
            className="rounded-lg p-1.5 text-stone-300 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Xoá bộ thẻ"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge className={SOURCE[deck.source].className}>{SOURCE[deck.source].label}</Badge>
        {deck.dueCount > 0 && <Badge className="bg-brand-50 text-brand-700 ring-brand-200">{deck.dueCount} cần ôn</Badge>}
        {deck.newCount > 0 && <Badge>{deck.newCount} mới</Badge>}
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex justify-between text-xs text-stone-500">
          <span>Đã thuộc</span>
          <span>
            {deck.learnedCount}/{deck.cardCount}
          </span>
        </div>
        <ProgressBar value={deck.cardCount ? deck.learnedCount / deck.cardCount : 0} barClassName="bg-emerald-500" />
        {empty ? (
          <p className="mt-4 text-center text-sm text-stone-400">
            {deck.source === 'saved' ? 'Lưu câu từ kho tra cứu để thêm thẻ' : 'Bộ thẻ trống'}
          </p>
        ) : (
          <Link
            to={`/flashcards/${deck.id}`}
            className={buttonClass(deck.dueCount + deck.newCount > 0 ? 'primary' : 'outline', 'md', 'mt-4 w-full')}
          >
            {deck.dueCount + deck.newCount > 0 ? 'Học ngay' : 'Xem bộ thẻ'}
          </Link>
        )}
      </div>
    </Card>
  )
}

function DeckGenerator({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'filter' | 'weak'>('filter')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>('')
  const [count, setCount] = useState(10)

  const generate = useMutation({
    mutationFn: (config: DeckGenerateConfig) => api.flashcards.generateDeck(config),
    meta: { tag: 'FLASHCARD' },
    onSuccess: (deck) => {
      log.info('generated deck', { deckId: deck.id, cards: deck.cardCount, fromWeak: mode === 'weak' })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      navigate(`/flashcards/${deck.id}`)
    },
  })

  return (
    <Card className="mb-6 animate-fade-in border-violet-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-stone-900">
            <Sparkles className="size-4 text-violet-500" /> Tạo bộ thẻ tự động
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">Chọn nguồn câu, hệ thống sẽ chọn lọc và tạo bộ thẻ ôn tập cho bạn.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Đóng">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {(
          [
            ['filter', 'Theo chủ đề / đặc trưng', 'Chọn câu thuộc chủ đề hoặc đặc trưng ngôn ngữ cụ thể'],
            ['weak', 'Từ điểm yếu của tôi', 'Những câu bạn đạt điểm thấp khi luyện giải nghĩa'],
          ] as const
        ).map(([m, title, text]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-xl border p-3 text-left transition',
              mode === m ? 'border-violet-500 bg-violet-50/60' : 'border-stone-200 hover:border-stone-300',
            )}
          >
            <span className="block text-sm font-medium text-stone-800">{title}</span>
            <span className="block text-xs text-stone-500">{text}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Label htmlFor="deck-name">Tên bộ thẻ (tuỳ chọn)</Label>
          <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tự đặt theo tiêu chí" />
        </div>
        {mode === 'filter' && (
          <>
            <div>
              <Label htmlFor="deck-topic">Chủ đề</Label>
              <Select id="deck-topic" value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')}>
                <option value="">Tất cả</option>
                {TOPIC_IDS.map((t) => (
                  <option key={t} value={t}>
                    {TOPICS[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="deck-trait">Đặc trưng</Label>
              <Select id="deck-trait" value={trait} onChange={(e) => setTrait(e.target.value as TraitId | '')}>
                <option value="">Tất cả</option>
                {TRAIT_IDS.map((t) => (
                  <option key={t} value={t}>
                    {TRAITS[t].label}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
        <div>
          <Label htmlFor="deck-count">Số thẻ: {count}</Label>
          <input
            id="deck-count"
            type="range"
            min={5}
            max={30}
            step={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-3 w-full accent-violet-600"
          />
        </div>
      </div>

      {generate.error && (
        <div className="mt-4">
          <ErrorMessage error={generate.error} />
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button
          loading={generate.isPending}
          onClick={() =>
            generate.mutate({
              name,
              count,
              fromWeak: mode === 'weak',
              topic: mode === 'filter' ? topic || undefined : undefined,
              trait: mode === 'filter' ? trait || undefined : undefined,
            })
          }
        >
          <WandSparkles className="size-4" /> {generate.isPending ? 'Đang tạo…' : 'Tạo bộ thẻ'}
        </Button>
      </div>
    </Card>
  )
}
