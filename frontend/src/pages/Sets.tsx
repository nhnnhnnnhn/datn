import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { DeckSource } from '@/types'
import { api } from '@/api'
import { PageHeader } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { DeckGenerator } from '@/components/sets/DeckGenerator'

const SOURCE_LABEL: Record<DeckSource, string> = { saved: 'Câu đã lưu', ai: 'Tự tạo', topic: 'Theo chủ đề' }

export default function Sets() {
  const [creating, setCreating] = useState(false)
  const { data: decks, isLoading, error } = useQuery({ queryKey: ['decks'], queryFn: api.flashcards.decks, meta: { tag: 'FLASHCARD' } })
  const due = decks?.reduce((s, d) => s + d.dueCount, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Bộ thẻ"
        description={decks ? `${decks.length} bộ thẻ · ${due} thẻ đến hạn ôn hôm nay` : undefined}
        action={
          <div className="flex gap-2">
            <Link to="/quiz" className={buttonClass('outline')}>
              Tạo bài trắc nghiệm
            </Link>
            <Button variant="dark" onClick={() => setCreating((v) => !v)}>
              Tạo bộ thẻ
            </Button>
          </div>
        }
      />

      {creating && <DeckGenerator onClose={() => setCreating(false)} />}

      {error ? (
        <ErrorMessage error={error} />
      ) : isLoading ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {decks?.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
              <div className="min-w-0 flex-1">
                <Link to={`/sets/${d.id}`} className="text-[15px] font-semibold text-stone-900 hover:text-brand-700">
                  {d.name}
                </Link>
                <p className="mt-0.5 text-sm text-stone-500">
                  {SOURCE_LABEL[d.source]} · {d.cardCount} thẻ · {d.learnedCount} đã thuộc
                </p>
              </div>
              <div className="text-sm text-stone-600 tabular-nums">
                {d.dueCount > 0 ? <span className="font-medium text-stone-900">{d.dueCount} cần ôn</span> : d.newCount > 0 ? `${d.newCount} thẻ mới` : 'Không có thẻ đến hạn'}
              </div>
              {d.cardCount > 0 ? (
                <Link to={`/sets/${d.id}/flashcards`} className={buttonClass(d.dueCount > 0 ? 'dark' : 'outline', 'sm', 'w-20')}>
                  {d.dueCount > 0 ? 'Ôn ngay' : 'Học'}
                </Link>
              ) : (
                <span className="w-20 text-center text-xs text-stone-400">Trống</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
