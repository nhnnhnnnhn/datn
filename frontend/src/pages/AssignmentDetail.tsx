import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { ScorePill } from '@/components/ui/Score'
import { SubmissionItems } from '@/components/assignments/SubmissionItems'
import { SUBMISSION_STATUS } from '@/lib/constants'
import { dueLabel } from '@/lib/dueLabel'
import { createLogger } from '@/lib/logger'

const log = createLogger('ASSIGNMENT')

export default function AssignmentDetail() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [revising, setRevising] = useState(false)

  const assignment = useQuery({ queryKey: ['assignment', id], queryFn: () => api.assignments.get(id), meta: { tag: 'ASSIGNMENT' } })
  const mine = useQuery({ queryKey: ['assignment', id, 'mine'], queryFn: () => api.assignments.mySubmission(id), meta: { tag: 'ASSIGNMENT' } })
  const idioms = useQueries({
    queries: (assignment.data?.idiomIds ?? []).map((idiomId) => ({
      queryKey: ['idiom', idiomId],
      queryFn: () => api.idioms.get(idiomId),
      meta: { tag: 'IDIOM' },
    })),
  })

  const submit = useMutation({
    mutationFn: () => api.assignments.submit(id, assignment.data!.idiomIds.map((idiomId) => ({ idiomId, answer: answers[idiomId] ?? '' }))),
    meta: { tag: 'ASSIGNMENT' },
    onSuccess: (sub) => {
      log.info('submitted assignment', { assignmentId: id, submissionId: sub.id, aiScore: sub.aiScore, status: sub.status })
      setRevising(false)
      queryClient.setQueryData(['assignment', id, 'mine'], sub)
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['grading'] })
    },
  })

  if (assignment.error) return <ErrorMessage error={assignment.error} />
  if (!assignment.data || mine.isLoading) return <Spinner />
  const a = assignment.data
  const submission = mine.data
  const status = submission?.status ?? a.myStatus ?? 'assigned'
  const canRevise = submission && submission.status !== 'returned'
  const showForm = !submission || revising
  const filled = a.idiomIds.filter((i) => answers[i]?.trim()).length

  function startRevising() {
    setAnswers(Object.fromEntries(submission!.items.map((item) => [item.idiomId, item.answer])))
    setRevising(true)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/assignments" className="text-sm text-stone-500 hover:text-stone-800">
        ← Bài tập
      </Link>
      <header className="mt-2 border-b border-stone-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{a.title}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {a.className} · {dueLabel(a.dueAt)} · <span className={SUBMISSION_STATUS[status].className}>{SUBMISSION_STATUS[status].label}</span>
        </p>
        {a.instructions && <p className="mt-3 text-[15px] text-stone-700">{a.instructions}</p>}
      </header>

      {submission?.teacherScore != null && (
        <section className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sky-900">Giáo viên đã chấm</h2>
            <ScorePill score={submission.teacherScore} />
          </div>
          {submission.teacherComment && <p className="mt-2 text-[15px] text-sky-950">{submission.teacherComment}</p>}
        </section>
      )}

      {showForm ? (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate()
          }}
        >
          <ol className="space-y-6">
            {a.idiomIds.map((idiomId, i) => {
              const idiom = idioms[i]?.data
              return (
                <li key={idiomId}>
                  <label htmlFor={`ans-${idiomId}`} className="block font-serif text-lg font-semibold text-stone-900">
                    <span className="mr-2 font-sans text-sm font-normal text-stone-400">{i + 1}.</span>
                    {idiom?.phrase ?? '…'}
                  </label>
                  <Textarea
                    id={`ans-${idiomId}`}
                    rows={3}
                    value={answers[idiomId] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [idiomId]: e.target.value }))}
                    placeholder="Câu này có nghĩa là…"
                    className="mt-2 text-[15px]"
                  />
                </li>
              )
            })}
          </ol>
          {submit.error && (
            <div className="mt-4">
              <ErrorMessage error={submit.error} />
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" variant="dark" size="lg" loading={submit.isPending} disabled={filled < a.idiomIds.length}>
              {submit.isPending ? 'Đang chấm…' : revising ? 'Nộp lại' : 'Nộp bài'}
            </Button>
            {revising && (
              <Button variant="ghost" onClick={() => setRevising(false)}>
                Huỷ
              </Button>
            )}
            <span className="text-sm text-stone-500">
              Đã viết {filled}/{a.idiomIds.length} câu
            </span>
          </div>
        </form>
      ) : (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-stone-900">
              Bài đã nộp{' '}
              <span className="font-normal text-stone-500">
                — {new Date(submission!.submittedAt!).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-600">Điểm AI</span>
              {submission!.aiScore != null && <ScorePill score={submission!.aiScore} />}
              {canRevise && (
                <Button variant="outline" size="sm" onClick={startRevising}>
                  Sửa và nộp lại
                </Button>
              )}
            </div>
          </div>
          <SubmissionItems items={submission!.items} />
        </section>
      )}
    </div>
  )
}
