import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { ScorePill } from '@/components/ui/Score'
import { SubmissionItems } from '@/components/assignments/SubmissionItems'
import { ReviewForm } from '@/components/teacher/ReviewForm'
import { SUBMISSION_STATUS } from '@/lib/constants'
import { dueLabel } from '@/lib/dueLabel'
import { cn } from '@/lib/cn'

export default function AssignmentReview() {
  const { id = '' } = useParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const assignment = useQuery({ queryKey: ['assignment', id], queryFn: () => api.assignments.get(id), meta: { tag: 'ASSIGNMENT' } })
  const submissions = useQuery({ queryKey: ['submissions', id], queryFn: () => api.assignments.submissions(id), meta: { tag: 'ASSIGNMENT' } })

  if (assignment.error || submissions.error) return <ErrorMessage error={assignment.error ?? submissions.error} />
  if (!assignment.data || !submissions.data) return <Spinner />
  const a = assignment.data
  const subs = submissions.data
  const turnedIn = subs.filter((s) => s.submittedAt)
  const returned = subs.filter((s) => s.status === 'returned').length
  const selected = subs.find((s) => s.id === selectedId) ?? turnedIn[0] ?? null

  const perIdiom = a.idiomIds.map((idiomId) => {
    const scores = turnedIn.flatMap((s) => s.items.filter((i) => i.idiomId === idiomId).map((i) => i.overall))
    const phrase = turnedIn.flatMap((s) => s.items).find((i) => i.idiomId === idiomId)?.phrase ?? `#${idiomId}`
    return { idiomId, phrase, avg: scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null }
  })

  return (
    <div>
      <Link to={`/teacher/classes/${a.classId}`} className="text-sm text-stone-500 hover:text-stone-800">
        ← {a.className}
      </Link>
      <header className="mt-2 border-b border-stone-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{a.title}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {dueLabel(a.dueAt)} · {turnedIn.length} đã nộp · {subs.length - turnedIn.length} chưa nộp · {returned} đã trả bài
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-stone-900">Điểm AI trung bình theo câu</h2>
        <ul className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {perIdiom.map((p) => (
            <li key={p.idiomId} className="flex items-center justify-between gap-3 border-b border-stone-100 py-1.5">
              <Link to={`/idioms/${p.idiomId}`} className="truncate text-stone-800 hover:text-brand-700">
                {p.phrase}
              </Link>
              {p.avg != null ? <ScorePill score={Math.round(p.avg * 10) / 10} /> : <span className="text-stone-400">—</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ul className="max-h-[70vh] divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200 lg:sticky lg:top-20">
          {subs.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => s.submittedAt && setSelectedId(s.id)}
                disabled={!s.submittedAt}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                  selected?.id === s.id ? 'bg-stone-100' : s.submittedAt ? 'hover:bg-stone-50' : 'cursor-default',
                )}
              >
                <span className="min-w-0">
                  <span className={cn('block truncate', s.submittedAt ? 'text-stone-900' : 'text-stone-400')}>{s.studentName}</span>
                  <span className={cn('block text-xs', SUBMISSION_STATUS[s.status].className)}>{SUBMISSION_STATUS[s.status].label}</span>
                </span>
                {s.teacherScore != null ? (
                  <ScorePill score={s.teacherScore} />
                ) : s.aiScore != null ? (
                  <span className="text-xs text-stone-500 tabular-nums">AI {s.aiScore}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-stone-900">{selected.studentName}</h2>
                <p className="text-sm text-stone-500">
                  Nộp {new Date(selected.submittedAt!).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                  <span className={SUBMISSION_STATUS[selected.status].className}>{SUBMISSION_STATUS[selected.status].label}</span>
                </p>
              </div>
              <SubmissionItems items={selected.items} />
              <ReviewForm key={selected.id} submission={selected} />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-stone-500">Chưa có học sinh nào nộp bài.</p>
          )}
        </div>
      </div>
    </div>
  )
}
