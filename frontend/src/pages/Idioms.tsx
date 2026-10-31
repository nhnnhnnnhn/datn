import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Section } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { IdiomResult } from '@/components/idiom/IdiomResult'
import { GlossaryList, type GlossaryEntry } from '@/components/idiom/GlossaryList'
import { DailyIdiomBox } from '@/components/idiom/DailyIdiomBox'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'

const PAGE_SIZE = 20

export default function Idioms() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const topic = (params.get('topic') as TopicId | null) ?? undefined
  const trait = (params.get('trait') as TraitId | null) ?? undefined
  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setSearch(q)
  }

  function update(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    update({ q: search.trim() || undefined })
  }

  const query = useInfiniteQuery({
    queryKey: ['idioms', 'search', { q, topic, trait }],
    queryFn: ({ pageParam }) => api.idioms.list({ q, topic, trait, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    meta: { tag: 'IDIOM' },
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0
  const glossary: GlossaryEntry[] = []
  const seenTerms = new Set<string>()
  for (const idiom of items) {
    for (const g of idiom.glossary ?? []) {
      if (seenTerms.has(g.term)) continue
      seenTerms.add(g.term)
      glossary.push({ ...g, source: { id: idiom.id, phrase: idiom.phrase } })
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gõ có dấu hoặc không dấu, ví dụ: com sung chao gien, tham lam, mưa nắng…"
            aria-label="Tìm kiếm thành ngữ"
            className="h-12 w-full rounded-md border border-stone-300 pr-3 pl-11 text-[17px] placeholder:text-stone-400 focus:border-stone-600 focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
          />
        </div>
        <Button type="submit" variant="dark" className="h-12 px-5">
          Tra
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Select value={topic ?? ''} onChange={(e) => update({ topic: e.target.value || undefined })} className="h-8 w-auto" aria-label="Chủ đề">
          <option value="">Mọi chủ đề</option>
          {TOPIC_IDS.map((t) => (
            <option key={t} value={t}>
              {TOPICS[t].label}
            </option>
          ))}
        </Select>
        <Select value={trait ?? ''} onChange={(e) => update({ trait: e.target.value || undefined })} className="h-8 w-auto" aria-label="Đặc trưng">
          <option value="">Mọi đặc trưng</option>
          {TRAIT_IDS.map((t) => (
            <option key={t} value={t}>
              {TRAITS[t].label}
            </option>
          ))}
        </Select>
        {(q || topic || trait) && (
          <button
            onClick={() => {
              setSearch('')
              setParams({}, { replace: true })
            }}
            className="text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Section title={q ? `Kết quả cho “${q}”` : 'Thành ngữ, tục ngữ'} count={query.data ? `${total} câu` : undefined}>
          {query.error ? (
            <ErrorMessage error={query.error} />
          ) : query.isLoading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState title="Không tìm thấy câu phù hợp" description="Thử từ khoá ngắn hơn, gõ không dấu, hoặc bỏ bớt bộ lọc." />
          ) : (
            <>
              <div className="-mt-4">
                {items.map((idiom) => (
                  <IdiomResult key={idiom.id} idiom={idiom} />
                ))}
              </div>
              {query.hasNextPage && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                    Xem thêm câu
                  </Button>
                </div>
              )}
            </>
          )}
        </Section>

        <aside className="space-y-8">
          {glossary.length > 0 && (
            <Section title="Từ khó" count={glossary.length}>
              <div className="-mt-3">
                <GlossaryList items={glossary.slice(0, 8)} />
              </div>
            </Section>
          )}
          <DailyIdiomBox />
        </aside>
      </div>
    </div>
  )
}
