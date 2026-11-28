import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { Panel, Section } from '@/components/ui/Card'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { TOPICS, TOPIC_IDS } from '@/lib/constants'
import { AreaChart } from './charts/AreaChart'
import { BarList } from './charts/BarList'
import { ChartCard } from './charts/ChartCard'
import { DonutChart } from './charts/DonutChart'

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
  const topics = TOPIC_IDS.map((id) => ({ label: TOPICS[id].label, value: content.byTopic[id] ?? 0 })).sort((a, b) => b.value - a.value)

  return (
    <Section title="Tổng quan">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Người dùng" value={users.total} />
        <Tile label="Học sinh" value={users.students} />
        <Tile label="Quản trị viên" value={users.admins} />
        <Tile label="Đăng ký 7 ngày qua" value={users.newLast7Days} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Đăng ký mới" subtitle="14 ngày gần nhất" className="lg:col-span-2">
          <AreaChart data={signupsByDay.map((d) => ({ date: d.date, value: d.count }))} unit="đăng ký" />
        </ChartCard>
        <ChartCard title="Hoạt động học tập" subtitle="Tổng số lượt">
          <DonutChart
            centerLabel="lượt học"
            slices={[
              { label: 'Chấm bài viết', value: activity.gradings, color: '#b93a2e' },
              { label: 'Làm trắc nghiệm', value: activity.quizzes, color: '#3b6fe0' },
              { label: 'Ôn thẻ', value: activity.flashcardReviews, color: '#0f766e' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Thành ngữ theo chủ đề" subtitle={`${content.idioms.toLocaleString('vi-VN')} câu`} className="lg:col-span-3">
          <BarList items={topics} unit="câu" />
        </ChartCard>
      </div>
    </Section>
  )
}
