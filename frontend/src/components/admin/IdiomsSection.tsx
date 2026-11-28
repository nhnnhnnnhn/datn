import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '@/api'
import type { Idiom, TopicId } from '@/types'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { TOPICS, TOPIC_IDS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { IdiomForm } from './IdiomForm'

const log = createLogger('ADMIN')
const PAGE_SIZE = 10

export function IdiomsSection() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Idiom | undefined>()
  const [deleting, setDeleting] = useState<Idiom | null>(null)
  const debouncedQ = useDebouncedValue(q.trim(), 250)

  const idioms = useQuery({
    queryKey: ['idioms', 'admin', { q: debouncedQ, topic, page }],
    queryFn: () => api.idioms.list({ q: debouncedQ || undefined, topic: topic || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    meta: { tag: 'ADMIN' },
  })

  const archive = useMutation({
    mutationFn: (id: number) => api.admin.archiveIdiom(id),
    meta: { tag: 'ADMIN' },
    onSuccess: (_, id) => {
      log.info('idiom archived', { idiomId: id })
      if (idioms.data?.items.length === 1 && page > 1) setPage(page - 1)
      setDeleting(null)
      queryClient.invalidateQueries({ queryKey: ['idioms'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const total = idioms.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function openForm(idiom?: Idiom) {
    setEditing(idiom)
    setFormOpen(true)
  }

  return (
    <Section
      title="Thành ngữ, tục ngữ"
      count={idioms.data ? total.toLocaleString('vi-VN') : undefined}
      action={
        <Button size="sm" onClick={() => openForm()}>
          <Plus className="size-4" />
          Thêm câu
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="Tìm theo cụm từ hoặc giải thích"
          aria-label="Tìm thành ngữ"
          className="min-w-60 flex-1"
        />
        <Select
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value as TopicId | '')
            setPage(1)
          }}
          aria-label="Lọc theo chủ đề"
          className="w-48"
        >
          <option value="">Mọi chủ đề</option>
          {TOPIC_IDS.map((id) => (
            <option key={id} value={id}>
              {TOPICS[id].label}
            </option>
          ))}
        </Select>
      </div>

      {idioms.error ? (
        <div className="space-y-3">
          <ErrorMessage error={idioms.error} />
          <Button variant="outline" size="sm" onClick={() => idioms.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !idioms.data ? (
        <Spinner />
      ) : idioms.data.items.length === 0 ? (
        <EmptyState title="Không có câu phù hợp" description="Thử từ khoá ngắn hơn hoặc bỏ bộ lọc chủ đề." />
      ) : (
        <ul className="divide-y divide-stone-100">
          {idioms.data.items.map((idiom) => (
            <li key={idiom.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-serif font-semibold text-stone-900">{idiom.phrase}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{idiom.explanation}</p>
                <p className="mt-1 text-xs text-stone-500">{TOPICS[idiom.topic].label}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openForm(idiom)} aria-label={`Sửa ${idiom.phrase}`}>
                  Sửa
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleting(idiom)} aria-label={`Xóa ${idiom.phrase}`}>
                  Xóa
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      <IdiomForm open={formOpen} idiom={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa thành ngữ, tục ngữ"
        message={
          <div className="space-y-3">
            <p>
              Xóa <strong>{deleting?.phrase}</strong>? Câu này sẽ bị ẩn khỏi tra cứu, câu của ngày và các bài tạo mới của học sinh.
              Lịch sử học và bộ thẻ đã có vẫn giữ nguyên.
            </p>
            {archive.error != null && <ErrorMessage error={archive.error} />}
          </div>
        }
        pending={archive.isPending}
        onConfirm={() => deleting && archive.mutate(deleting.id)}
        onCancel={() => {
          archive.reset()
          setDeleting(null)
        }}
      />
    </Section>
  )
}
