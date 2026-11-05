import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Layers, ListChecks, PenLine } from 'lucide-react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { Section } from '@/components/ui/Card'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { ScorePill } from '@/components/ui/Score'
import { StreakBox } from '@/components/progress/StreakBox'
import { MasteryBar } from '@/components/progress/MasteryBar'
import { MasteryLegend } from '@/components/progress/MasteryLegend'
import { DailyIdiomFeature } from '@/components/idiom/DailyIdiomFeature'
import { TOPICS, TRAITS } from '@/lib/constants'

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  const decks = useQuery({ queryKey: ['decks'], queryFn: api.flashcards.decks, meta: { tag: 'FLASHCARD' } })
  const history = useQuery({ queryKey: ['grading', 'history', 5], queryFn: () => api.grading.history(5), meta: { tag: 'GRADING' } })

  const s = summary.data
  const dueDeck = decks.data?.filter((d) => d.dueCount > 0).sort((a, b) => b.dueCount - a.dueCount)[0]
  const weakest = s?.byTrait.filter((t) => t.avgScore != null).sort((a, b) => a.avgScore! - b.avgScore!)[0]

  const today = [
    {
      to: dueDeck ? `/sets/${dueDeck.id}/flashcards` : '/sets',
      icon: Layers,
      title: 'Ôn thẻ đến hạn',
      detail: s ? (s.cardsDue ? `${s.cardsDue} thẻ, khoảng ${Math.max(1, Math.round(s.cardsDue / 3))} phút` : 'Không còn thẻ đến hạn') : '…',
    },
    { to: '/practice', icon: PenLine, title: 'Luyện viết một câu', detail: 'Tự giải nghĩa, nhận góp ý theo 4 tiêu chí' },
    { to: '/quiz', icon: ListChecks, title: 'Trắc nghiệm nhanh', detail: '10 câu sinh tự động từ kho' },
  ]

  const stats = s && [
    { label: 'Câu đã học', value: `${s.studiedCount}/${s.totalIdioms}` },
    { label: 'Đã thuộc', value: s.learnedCount },
    { label: 'Điểm viết TB', value: s.avgScore != null ? s.avgScore.toFixed(1) : '—' },
    { label: 'Trắc nghiệm đúng', value: s.quizAccuracy != null ? `${Math.round(s.quizAccuracy * 100)}%` : '—' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Chào {user?.name}</h1>
        <p className="mt-1 text-[15px] text-stone-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <DailyIdiomFeature />
        {s ? <StreakBox summary={s} /> : <Spinner />}
      </div>

      <Section title="Hôm nay">
        <div className="grid gap-3 sm:grid-cols-3">
          {today.map(({ to, icon: Icon, title, detail }) => (
            <Link
              key={title}
              to={to}
              className="group flex items-start gap-3 rounded-lg border border-stone-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <span className="min-w-0">
                <span className="block font-medium text-stone-900 group-hover:text-brand-700">{title}</span>
                <span className="mt-0.5 block text-sm text-stone-500">{detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {summary.error ? (
        <ErrorMessage error={summary.error} />
      ) : !s || !stats ? (
        <Spinner />
      ) : (
        <>
          <Section title="Tiến độ" count={`chuỗi ${s.streak} ngày · ${s.practiceCount} bài viết · ${s.quizCount} lần trắc nghiệm · ${s.reviewCount} lượt ôn thẻ`}>
            <dl className="grid grid-cols-2 divide-stone-200 rounded-lg border border-stone-200 sm:grid-cols-4 sm:divide-x">
              {stats.map((st) => (
                <div key={st.label} className="px-4 py-3">
                  <dt className="text-xs text-stone-500">{st.label}</dt>
                  <dd className="mt-0.5 text-2xl font-semibold text-stone-900">{st.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

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

          {s.weakIdioms.length > 0 && (
            <Section title="Nên luyện lại" count={s.weakIdioms.length}>
              <ul className="divide-y divide-stone-100">
                {s.weakIdioms.map(({ idiom, bestScore }) => (
                  <li key={idiom.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <Link to={`/idioms/${idiom.id}`} className="text-[15px] text-stone-800 hover:text-brand-700">
                        {idiom.phrase}
                      </Link>
                      <p className="text-xs text-stone-500">Điểm cao nhất {bestScore}/5</p>
                    </div>
                    <Link to={`/practice?idiom=${idiom.id}`} className="shrink-0 text-sm text-brand-700 hover:underline">
                      Viết lại
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Lịch sử chấm bài viết" count="5 bài gần nhất">
            {history.error ? (
              <ErrorMessage error={history.error} />
            ) : !history.data ? (
              <Spinner />
            ) : history.data.length ? (
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
                    {history.data.map((a) => (
                      <tr key={a.id}>
                        <td className="max-w-[16rem] truncate py-2">
                          <Link to={`/practice?idiom=${a.idiomId}`} className="text-stone-800 hover:text-brand-700">
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
            ) : (
              <EmptyState title="Chưa có bài viết nào" />
            )}
          </Section>
        </>
      )}
    </div>
  )
}
