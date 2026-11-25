import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Submission } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { createLogger } from '@/lib/logger'

const log = createLogger('ASSIGNMENT')

export function ReviewForm({ submission }: { submission: Submission }) {
  const queryClient = useQueryClient()
  const [score, setScore] = useState(String(submission.teacherScore ?? submission.aiScore ?? ''))
  const [comment, setComment] = useState(submission.teacherComment ?? '')

  const review = useMutation({
    mutationFn: () => api.assignments.review(submission.id, { score: Number(score), comment }),
    meta: { tag: 'ASSIGNMENT' },
    onSuccess: (sub) => {
      log.info('returned submission', { submissionId: sub.id, teacherScore: sub.teacherScore, aiScore: sub.aiScore })
      queryClient.invalidateQueries({ queryKey: ['submissions', submission.assignmentId] })
    },
  })

  return (
    <form
      className="rounded-lg border border-stone-200 bg-stone-50 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        review.mutate()
      }}
    >
      <div className="flex items-end gap-3">
        <div className="w-28">
          <Label htmlFor="teacher-score">Điểm (0–5)</Label>
          <Input id="teacher-score" type="number" min={0} max={5} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} required />
        </div>
        <p className="pb-2 text-sm text-stone-500">AI gợi ý {submission.aiScore ?? '—'}/5</p>
      </div>
      <div className="mt-3">
        <Label htmlFor="teacher-comment">Nhận xét cho học sinh</Label>
        <Textarea id="teacher-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {review.error && (
        <div className="mt-3">
          <ErrorMessage error={review.error} />
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="dark" loading={review.isPending}>
          {submission.status === 'returned' ? 'Cập nhật' : 'Trả bài'}
        </Button>
        {review.isSuccess && <span className="text-sm text-emerald-700">Đã trả bài</span>}
      </div>
    </form>
  )
}
