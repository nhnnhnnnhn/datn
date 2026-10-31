import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { PageHeader, Section } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { dueLabel } from '@/lib/dueLabel'
import { createLogger } from '@/lib/logger'

const log = createLogger('CLASS')

export default function Classes() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const classes = useQuery({ queryKey: ['classes'], queryFn: api.classes.list, meta: { tag: 'CLASS' } })
  const assignments = useQuery({ queryKey: ['assignments', 'all'], queryFn: () => api.assignments.list(), meta: { tag: 'ASSIGNMENT' } })

  const create = useMutation({
    mutationFn: () => api.classes.create(name),
    meta: { tag: 'CLASS' },
    onSuccess: (cls) => {
      log.info('created class', { classId: cls.id })
      setName('')
      setCreating(false)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })

  const upcoming = (assignments.data ?? []).filter((a) => new Date(a.dueAt).getTime() > Date.now() - 7 * 86_400_000)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <PageHeader
          title="Lớp học"
          action={
            <Button variant="dark" onClick={() => setCreating((v) => !v)}>
              Tạo lớp
            </Button>
          }
        />
        {creating && (
          <form
            className="mb-6 flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate()
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên lớp, VD: Lớp 11A2 · Ngữ văn" aria-label="Tên lớp" className="min-w-60 flex-1" />
            <Button type="submit" variant="dark" loading={create.isPending}>
              Tạo
            </Button>
            {create.error && (
              <div className="w-full">
                <ErrorMessage error={create.error} />
              </div>
            )}
          </form>
        )}
        {classes.error ? (
          <ErrorMessage error={classes.error} />
        ) : !classes.data ? (
          <Spinner />
        ) : classes.data.length === 0 ? (
          <EmptyState title="Chưa có lớp nào" />
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {classes.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <Link to={`/teacher/classes/${c.id}`} className="text-[15px] font-semibold text-stone-900 hover:text-brand-700">
                    {c.name}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {c.studentCount} học sinh · Mã lớp <span className="font-mono text-stone-700">{c.code}</span>
                  </p>
                </div>
                <Link to={`/teacher/classes/${c.id}`} className="text-sm text-brand-700 hover:underline">
                  Mở lớp
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside>
        <Section title="Bài tập gần đây">
          {!assignments.data ? (
            <Spinner />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-stone-500">Chưa giao bài nào.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <Link to={`/teacher/assignments/${a.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                    {a.title}
                  </Link>
                  <p className="text-stone-500">
                    {a.submittedCount}/{a.studentCount} đã nộp · {dueLabel(a.dueAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </aside>
    </div>
  )
}
