import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import type { TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Section } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { IdiomResult } from '@/components/idiom/IdiomResult'
import { DailyIdiomBox } from '@/components/idiom/DailyIdiomBox'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'

const PAGE_SIZES = [10, 20, 50, 100]

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
    if (!('page' in next)) p.delete('page')
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

  const pageSize = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : PAGE_SIZES[1]
  const page = Math.max(1, Number(params.get('page')) || 1)

  const query = useQuery({
    queryKey: ['idioms', 'search', { q, topic, trait, page, pageSize }],
    queryFn: () => api.idioms.list({ q, topic, trait, page, pageSize }),
    placeholderData: keepPreviousData,
    meta: { tag: 'IDIOM' },
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  function goToPage(next: number) {
    update({ page: next > 1 ? String(next) : undefined })
    window.scrollTo({ top: 0 })
  }

  return (
    <div>
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thành ngữ, tục ngữ"
            aria-label="Tìm kiếm thành ngữ"
            className="h-12 w-full rounded-md border border-stone-300 pr-3 pl-11 text-[17px] placeholder:text-stone-400 focus:border-stone-600 focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
          />
        </div>
        <Button type="submit" variant="dark" className="h-12 px-5">
          Tìm kiếm
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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <Pagination page={page} pages={pages} onChange={goToPage} />
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  Số câu mỗi trang
                  <Select
                    value={pageSize}
                    onChange={(e) => update({ size: e.target.value === String(PAGE_SIZES[1]) ? undefined : e.target.value, page: undefined })}
                    className="h-8 w-auto"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
            </>
          )}
        </Section>

        <aside>
          <DailyIdiomBox />
        </aside>
      </div>
    </div>
  )
}
