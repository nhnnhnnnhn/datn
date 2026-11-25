import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeckGenerateConfig, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('FLASHCARD')

export function DeckGenerator({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [source, setSource] = useState<'filter' | 'weak'>('filter')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>('')
  const [count, setCount] = useState(10)

  const generate = useMutation({
    mutationFn: (config: DeckGenerateConfig) => api.flashcards.generateDeck(config),
    meta: { tag: 'FLASHCARD' },
    onSuccess: (deck) => {
      log.info('generated deck', { deckId: deck.id, cards: deck.cardCount, fromWeak: source === 'weak' })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      navigate(`/sets/${deck.id}`)
    },
  })

  return (
    <form
      className="mb-8 rounded-lg border border-stone-200 bg-stone-50 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        generate.mutate({
          name,
          count,
          fromWeak: source === 'weak',
          topic: source === 'filter' ? topic || undefined : undefined,
          trait: source === 'filter' ? trait || undefined : undefined,
        })
      }}
    >
      <h2 className="text-base font-semibold text-stone-900">Tạo bộ thẻ tự động</h2>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Lấy câu từ</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="source" checked={source === 'filter'} onChange={() => setSource('filter')} className="accent-stone-900" />
            Chủ đề hoặc đặc trưng
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="source" checked={source === 'weak'} onChange={() => setSource('weak')} className="accent-stone-900" />
            Câu tôi làm điểm thấp (≤ 3)
          </label>
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {source === 'filter' && (
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
          <Label htmlFor="deck-count">Số thẻ</Label>
          <Select id="deck-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n} thẻ
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="deck-name">Tên bộ thẻ (tuỳ chọn)</Label>
          <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      {generate.error && (
        <div className="mt-4">
          <ErrorMessage error={generate.error} />
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button type="submit" variant="dark" loading={generate.isPending}>
          Tạo bộ thẻ
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}
