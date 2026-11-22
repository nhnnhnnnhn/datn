import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { Panel, Section } from '@/components/ui/Card'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <Panel className="px-4 py-3">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value.toLocaleString('vi-VN')}</p>
    </Panel>
  )
}

export function StatsSection() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: api.admin.stats, meta: { tag: 'ADMIN' } })

  if (stats.error) return <ErrorMessage error={stats.error} />
  if (!stats.data) return <Spinner />

  const { users, content, activity, signupsByDay } = stats.data
  const peak = Math.max(1, ...signupsByDay.map((d) => d.count))

  return (
    <Section title="Tổng quan">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Người dùng" value={users.total} />
        <Tile label="Học sinh" value={users.students} />
        <Tile label="Giáo viên" value={users.teachers} />
        <Tile label="Đăng ký 7 ngày qua" value={users.newLast7Days} />
        <Tile label="Thành ngữ trong kho" value={content.idioms} />
        <Tile label="Lượt chấm bài viết" value={activity.gradings} />
        <Tile label="Lượt làm trắc nghiệm" value={activity.quizzes} />
        <Tile label="Lượt ôn thẻ" value={activity.flashcardReviews} />
      </div>

      <Panel className="mt-4 p-4">
        <p className="text-sm font-medium text-stone-700">Đăng ký mới theo ngày (14 ngày)</p>
        <ul className="mt-3 flex h-24 items-end gap-1.5" aria-label="Đăng ký mới theo ngày">
          {signupsByDay.map((d) => (
            <li key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.count}`}>
              <div className="min-h-px rounded-t bg-brand-600" style={{ height: `${(d.count / peak) * 100}%` }} />
            </li>
          ))}
        </ul>
        <div className="mt-1 flex justify-between text-xs text-stone-500">
          <span>{signupsByDay[0]?.date}</span>
          <span>{signupsByDay.at(-1)?.date}</span>
        </div>
      </Panel>
    </Section>
  )
}
