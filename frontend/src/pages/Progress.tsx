import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { PageHeader, Section } from '@/components/ui/Card'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { ScorePill } from '@/components/ui/Score'
import { MasteryBar } from '@/components/progress/MasteryBar'
import { MasteryLegend } from '@/components/progress/MasteryLegend'
import { ActivityHeatmap } from '@/components/progress/ActivityHeatmap'
import { ScoreTrendChart } from '@/components/progress/ScoreTrendChart'
import { TOPICS, TRAITS } from '@/lib/constants'

export default function Progress() {
  const summary = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  const history = useQuery({ queryKey: ['grading', 'history', 15], queryFn: () => api.grading.history(15), meta: { tag: 'GRADING' } })

  if (summary.error) return <ErrorMessage error={summary.error} />
  if (!summary.data) return <Spinner />
  const s = summary.data
  const weakest = s.byTrait.filter((t) => t.avgScore != null).sort((a, b) => a.avgScore! - b.avgScore!)[0]

  const stats = [
    { label: 'Câu đã học', value: `${s.studiedCount}/${s.totalIdioms}` },
    { label: 'Đã thuộc', value: s.learnedCount },
    { label: 'Điểm viết TB', value: s.avgScore != null ? s.avgScore.toFixed(1) : '—' },
    { label: 'Trắc nghiệm đúng', value: s.quizAccuracy != null ? `${Math.round(s.quizAccuracy * 100)}%` : '—' },
  ]

  return (
    <div className="space-y-10">
      <PageHeader title="Tiến độ" description={`Chuỗi ${s.streak} ngày · ${s.practiceCount} bài viết · ${s.quizCount} lần trắc nghiệm · ${s.reviewCount} lượt ôn thẻ`} />

      <dl className="-mt-4 grid grid-cols-2 divide-stone-200 rounded-lg border border-stone-200 sm:grid-cols-4 sm:divide-x">
        {stats.map((st) => (
          <div key={st.label} className="px-4 py-3">
            <dt className="text-xs text-stone-500">{st.label}</dt>
            <dd className="mt-0.5 text-2xl font-semibold text-stone-900">{st.value}</dd>
          </div>
        ))}
      </dl>

      <Section title="Mức độ thành thạo theo đặc trưng" action={<MasteryLegend />}>
        <p className="mb-4 text-sm text-stone-500">5 đặc trưng ngôn ngữ theo phân loại của VIVID. Mỗi thanh là toàn bộ câu mang đặc trưng đó, chia theo điểm cao nhất bạn đạt được.</p>
        <ul className="space-y-4">
          {s.byTrait.map((t) => (
            <li key={t.trait} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_5rem]">
              <span className="text-sm font-medium text-stone-800">{TRAITS[t.trait].label}</span>
              <MasteryBar levels={t.levels} total={t.total} />
              <span className="text-sm text-stone-500 tabular-nums sm:text-right">{t.avgScore != null ? `TB ${t.avgScore.toFixed(1)}` : 'chưa học'}</span>
            </li>
          ))}
        </ul>
        {weakest && (
          <p className="mt-5 text-sm text-stone-700">
            Nhóm yếu nhất: <span className="font-medium">{TRAITS[weakest.trait].label}</span>. {TRAITS[weakest.trait].hint}{' '}
            <Link to={`/idioms?trait=${weakest.trait}`} className="text-brand-700 hover:underline">
              Xem các câu này
            </Link>
          </p>
        )}
      </Section>

      <Section title="Điểm luyện viết theo ngày" count="30 ngày, thang 0–5">
        {s.scoreHistory.some((p) => p.value != null) ? <ScoreTrendChart points={s.scoreHistory} /> : <EmptyState title="Chưa có bài viết nào" />}
      </Section>

      <Section title="Theo chủ đề">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="py-2 font-medium">Chủ đề</th>
                <th className="py-2 text-right font-medium">Số câu</th>
                <th className="py-2 text-right font-medium">Đã học</th>
                <th className="py-2 text-right font-medium">Đã thuộc</th>
                <th className="py-2 text-right font-medium">Điểm TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {s.byTopic.map((t) => (
                <tr key={t.topic}>
                  <td className="py-2">
                    <Link to={`/idioms?topic=${t.topic}`} className="text-stone-800 hover:text-brand-700">
                      {TOPICS[t.topic].label}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-stone-600">{t.total}</td>
                  <td className="py-2 text-right text-stone-600">{t.studied}</td>
                  <td className="py-2 text-right text-stone-600">{t.learned}</td>
                  <td className="py-2 text-right text-stone-800">{t.avgScore != null ? t.avgScore.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Hoạt động">
        <ActivityHeatmap days={s.activity} />
      </Section>

      <Section title="Lịch sử chấm bài viết" count="15 bài gần nhất">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="py-2 font-medium">Câu</th>
                <th className="py-2 text-center font-medium">Cốt lõi</th>
                <th className="py-2 text-center font-medium">Sắc thái</th>
                <th className="py-2 text-center font-medium">Diễn đạt</th>
                <th className="py-2 text-center font-medium">Đầy đủ</th>
                <th className="py-2 text-center font-medium">Tổng</th>
                <th className="py-2 text-right font-medium">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {history.data?.map((a) => (
                <tr key={a.id}>
                  <td className="max-w-[16rem] truncate py-2">
                    <Link to={`/idioms/${a.idiomId}`} className="text-stone-800 hover:text-brand-700">
                      {a.phrase}
                    </Link>
                  </td>
                  <td className="py-2 text-center text-stone-600">{a.scores.accuracy}</td>
                  <td className="py-2 text-center text-stone-600">{a.scores.nuance}</td>
                  <td className="py-2 text-center text-stone-600">{a.scores.fluency}</td>
                  <td className="py-2 text-center text-stone-600">{a.scores.completeness}</td>
                  <td className="py-2 text-center">
                    <ScorePill score={a.overall} />
                  </td>
                  <td className="py-2 text-right text-stone-500">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
