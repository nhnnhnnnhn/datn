import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import type { IdiomKind, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { PageHeader } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { IdiomCard } from '@/components/idiom/IdiomCard'
import { KINDS, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 12

export default function Idioms() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const topic = (params.get('topic') as TopicId | null) ?? undefined
  const trait = (params.get('trait') as TraitId | null) ?? undefined
  const kind = (params.get('kind') as IdiomKind | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(q)

  function update(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    if (!('page' in next)) p.delete('page')
    setParams(p, { replace: true })
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== q) update({ q: search || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['idioms', { q, topic, trait, kind, page }],
    queryFn: () => api.idioms.list({ q, topic, trait, kind, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    meta: { tag: 'IDIOM' },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const hasFilter = !!(q || topic || trait || kind)

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Kho tra cứu"
        description="Tra cứu thành ngữ, tục ngữ theo từ khoá (gõ có dấu hoặc không dấu), chủ đề và đặc trưng ngôn ngữ."
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm “an qua nho ke trong cay”, “biết ơn”, “lười biếng”…"
              className="h-11 pl-10"
              aria-label="Tìm kiếm thành ngữ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select value={trait ?? ''} onChange={(e) => update({ trait: e.target.value || undefined })} className="h-11 sm:w-48" aria-label="Lọc theo đặc trưng">
              <option value="">Mọi đặc trưng</option>
              {TRAIT_IDS.map((t) => (
                <option key={t} value={t}>
                  {TRAITS[t].label}
                </option>
              ))}
            </Select>
            <Select value={kind ?? ''} onChange={(e) => update({ kind: e.target.value || undefined })} className="h-11 sm:w-40" aria-label="Lọc theo loại">
              <option value="">Thành ngữ & tục ngữ</option>
              {(Object.keys(KINDS) as IdiomKind[]).map((k) => (
                <option key={k} value={k}>
                  {KINDS[k]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            onClick={() => update({ topic: undefined })}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition',
              !topic ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300',
            )}
          >
            Tất cả chủ đề
          </button>
          {TOPIC_IDS.map((t) => (
            <button
              key={t}
              onClick={() => update({ topic: topic === t ? undefined : t })}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition',
                topic === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300',
              )}
            >
              {TOPICS[t].label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>
            {data ? `${data.total} kết quả` : '…'}
            {isFetching && !isLoading && ' · đang cập nhật'}
          </span>
          {hasFilter && (
            <button
              onClick={() => {
                setSearch('')
                setParams({}, { replace: true })
              }}
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
            >
              <X className="size-3.5" /> Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorMessage error={error} />
        ) : isLoading ? (
          <Spinner />
        ) : data && data.items.length > 0 ? (
          <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', isFetching && 'opacity-60 transition-opacity')}>
            {data.items.map((idiom) => (
              <IdiomCard key={idiom.id} idiom={idiom} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Search className="size-6" />} title="Không tìm thấy câu phù hợp" description="Thử từ khoá khác hoặc bỏ bớt bộ lọc." />
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} aria-label="Trang trước">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-3 text-sm text-stone-600">
            Trang {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })} aria-label="Trang sau">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
