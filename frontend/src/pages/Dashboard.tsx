import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { Section } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/Button'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { ScorePill } from '@/components/ui/Score'
import { StreakBox } from '@/components/progress/StreakBox'
import { DailyIdiomBox } from '@/components/idiom/DailyIdiomBox'
import { SUBMISSION_STATUS } from '@/lib/constants'
import { dueLabel } from '@/lib/dueLabel'
import { formatRelative } from '@/lib/text'

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  const decks = useQuery({ queryKey: ['decks'], queryFn: api.flashcards.decks, meta: { tag: 'FLASHCARD' } })
  const assignments = useQuery({ queryKey: ['assignments', 'mine'], queryFn: () => api.assignments.list(), meta: { tag: 'ASSIGNMENT' } })
  const history = useQuery({ queryKey: ['grading', 'history', 5], queryFn: () => api.grading.history(5), meta: { tag: 'GRADING' } })

  const s = summary.data
  const dueDeck = decks.data?.filter((d) => d.dueCount > 0).sort((a, b) => b.dueCount - a.dueCount)[0]
  const open = assignments.data?.filter((a) => a.myStatus === 'assigned' || a.myStatus === 'missing') ?? []

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Chào {user?.name}</h1>
          <p className="mt-1 text-[15px] text-stone-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <Section title="Hôm nay">
          <ul className="divide-y divide-stone-100">
            <li className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-stone-900">Ôn thẻ đến hạn</p>
                <p className="text-sm text-stone-500">
                  {s ? (s.cardsDue ? `${s.cardsDue} thẻ, khoảng ${Math.max(1, Math.round(s.cardsDue / 3))} phút` : 'Không còn thẻ đến hạn') : '…'}
                </p>
              </div>
              {dueDeck ? (
                <Link to={`/sets/${dueDeck.id}/flashcards`} className={buttonClass('dark', 'sm')}>
                  Ôn ngay
                </Link>
              ) : (
                <Link to="/sets" className={buttonClass('outline', 'sm')}>
                  Bộ thẻ
                </Link>
              )}
            </li>
            <li className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-stone-900">Luyện viết một câu</p>
                <p className="text-sm text-stone-500">Tự giải nghĩa và nhận góp ý theo 4 tiêu chí</p>
              </div>
              <Link to="/practice" className={buttonClass('outline', 'sm')}>
                Viết
              </Link>
            </li>
            <li className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-stone-900">Trắc nghiệm nhanh</p>
                <p className="text-sm text-stone-500">10 câu sinh tự động từ kho</p>
              </div>
              <Link to="/quiz" className={buttonClass('outline', 'sm')}>
                Làm bài
              </Link>
            </li>
          </ul>
        </Section>

        <Section
          title="Bài tập"
          count={assignments.data ? `${open.length} chưa nộp` : undefined}
          action={
            <Link to="/assignments" className="text-sm text-brand-700 hover:underline">
              Tất cả
            </Link>
          }
        >
          {!assignments.data ? (
            <Spinner />
          ) : assignments.data.length === 0 ? (
            <EmptyState title="Chưa có bài tập" description="Bài tập giáo viên giao sẽ hiện ở đây." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {assignments.data.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link to={`/assignments/${a.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                      {a.title}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {a.className} · {dueLabel(a.dueAt)}
                    </p>
                  </div>
                  {a.myStatus && <span className={`shrink-0 whitespace-nowrap text-sm ${SUBMISSION_STATUS[a.myStatus].className}`}>{SUBMISSION_STATUS[a.myStatus].label}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Bài viết gần đây"
          action={
            <Link to="/progress" className="text-sm text-brand-700 hover:underline">
              Tiến độ
            </Link>
          }
        >
          {history.data?.length ? (
            <ul className="divide-y divide-stone-100">
              {history.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link to={`/practice?idiom=${a.idiomId}`} className="min-w-0 truncate text-[15px] text-stone-800 hover:text-brand-700">
                    {a.phrase}
                  </Link>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-stone-500">{formatRelative(a.createdAt)}</span>
                    <ScorePill score={a.overall} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Chưa có bài viết nào" />
          )}
        </Section>

        {s && s.weakIdioms.length > 0 && (
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
      </div>

      <aside className="space-y-6">
        {s ? <StreakBox summary={s} /> : <Spinner />}
        <DailyIdiomBox />
      </aside>
    </div>
  )
}
