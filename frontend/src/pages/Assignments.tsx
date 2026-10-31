import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { Assignment } from '@/types'
import { api } from '@/api'
import { PageHeader, Section } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { JoinClassForm } from '@/components/assignments/JoinClassForm'
import { SUBMISSION_STATUS } from '@/lib/constants'
import { dueLabel } from '@/lib/dueLabel'

type Filter = 'todo' | 'missing' | 'done'

const FILTERS: Record<Filter, (a: Assignment) => boolean> = {
  todo: (a) => a.myStatus === 'assigned',
  missing: (a) => a.myStatus === 'missing',
  done: (a) => a.myStatus === 'submitted' || a.myStatus === 'late' || a.myStatus === 'returned',
}

export default function Assignments() {
  const [filter, setFilter] = useState<Filter>('todo')
  const assignments = useQuery({ queryKey: ['assignments', 'mine'], queryFn: () => api.assignments.list(), meta: { tag: 'ASSIGNMENT' } })
  const classes = useQuery({ queryKey: ['classes'], queryFn: api.classes.list, meta: { tag: 'CLASS' } })

  const all = assignments.data ?? []
  const count = (f: Filter) => all.filter(FILTERS[f]).length
  const shown = all.filter(FILTERS[filter])

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <PageHeader title="Bài tập" description="Bài giải nghĩa giáo viên giao cho lớp của em." />
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'todo', label: `Chưa nộp (${count('todo')})` },
            { value: 'missing', label: `Quá hạn (${count('missing')})` },
            { value: 'done', label: `Đã nộp (${count('done')})` },
          ]}
        />
        {assignments.error ? (
          <ErrorMessage error={assignments.error} />
        ) : assignments.isLoading ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <EmptyState title={filter === 'todo' ? 'Không còn bài nào phải nộp' : 'Không có bài nào'} />
        ) : (
          <ul className="divide-y divide-stone-100">
            {shown.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <Link to={`/assignments/${a.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                    {a.title}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {a.className} · {a.idiomIds.length} câu · {dueLabel(a.dueAt)}
                  </p>
                </div>
                {a.myStatus && <span className={`shrink-0 whitespace-nowrap text-sm ${SUBMISSION_STATUS[a.myStatus].className}`}>{SUBMISSION_STATUS[a.myStatus].label}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="space-y-8">
        <Section title="Lớp của em">
          {classes.data?.length ? (
            <ul className="space-y-2 text-sm">
              {classes.data.map((c) => (
                <li key={c.id}>
                  <p className="font-medium text-stone-900">{c.name}</p>
                  <p className="text-stone-500">
                    {c.teacherName} · {c.studentCount} học sinh
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Em chưa tham gia lớp nào.</p>
          )}
        </Section>
        <JoinClassForm />
      </aside>
    </div>
  )
}
