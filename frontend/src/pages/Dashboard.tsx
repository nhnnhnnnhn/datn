import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, Flame, Layers, ListChecks, PenLine, Target, Trophy } from 'lucide-react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/Button'
import { EmptyState, ProgressBar, Spinner } from '@/components/ui/Feedback'
import { scoreTone } from '@/components/ui/ScoreRing'
import { IdiomBadges } from '@/components/idiom/IdiomBadges'
import { formatRelative } from '@/lib/text'
import { cn } from '@/lib/cn'

function StatTile({ icon: Icon, label, value, sub, tone }: { icon: typeof Flame; label: string; value: string; sub?: string; tone: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <span className={cn('rounded-lg p-1.5', tone)}>
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-stone-900 sm:text-3xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-stone-500">{sub}</div>}
    </Card>
  )
}

const ACTIONS = [
  { to: '/practice', icon: PenLine, title: 'Luyện giải nghĩa', text: 'Viết lời giải nghĩa, AI chấm và góp ý' },
  { to: '/quiz', icon: ListChecks, title: 'Làm quiz', text: 'Câu hỏi trắc nghiệm sinh tự động' },
  { to: '/flashcards', icon: Layers, title: 'Ôn flashcard', text: 'Lặp lại ngắt quãng, nhớ lâu hơn' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [reveal, setReveal] = useState(false)
  const summary = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  const daily = useQuery({ queryKey: ['idioms', 'daily'], queryFn: api.idioms.daily, meta: { tag: 'IDIOM' } })
  const history = useQuery({ queryKey: ['grading', 'history', 5], queryFn: () => api.grading.history(5), meta: { tag: 'GRADING' } })

  const s = summary.data
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-sm capitalize text-stone-500">{today}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">Chào {user?.name}!</h1>
      </div>

      {s ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile icon={Flame} label="Chuỗi ngày học" value={`${s.streak} ngày`} sub={s.todayCount ? 'Hôm nay đã học' : 'Học ngay để giữ chuỗi'} tone="bg-orange-50 text-orange-600" />
          <StatTile icon={Trophy} label="Đã thuộc" value={`${s.learnedCount}`} sub={`trên ${s.totalIdioms} câu trong kho`} tone="bg-emerald-50 text-emerald-600" />
          <StatTile icon={PenLine} label="Điểm giải nghĩa TB" value={s.avgScore != null ? s.avgScore.toFixed(1) : '—'} sub={`${s.practiceCount} bài đã chấm`} tone="bg-brand-50 text-brand-600" />
          <StatTile icon={Layers} label="Thẻ cần ôn" value={`${s.cardsDue}`} sub="đến hạn hôm nay" tone="bg-sky-50 text-sky-600" />
        </div>
      ) : (
        <Spinner />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="relative overflow-hidden lg:col-span-3">
          <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-gold-100/60" />
          <div className="relative p-6">
            <div className="text-xs font-semibold tracking-wider text-gold-700 uppercase">Câu hôm nay</div>
            {daily.data ? (
              <>
                <h2 className="mt-3 font-serif text-2xl leading-snug font-semibold text-stone-900 sm:text-3xl">
                  “{daily.data.phrase}”
                </h2>
                <div className="mt-3">
                  <IdiomBadges idiom={daily.data} />
                </div>
                {reveal ? (
                  <p className="mt-4 animate-fade-in leading-relaxed text-stone-600">{daily.data.explanation}</p>
                ) : (
                  <p className="mt-4 text-sm text-stone-500">Bạn hiểu câu này thế nào? Thử tự giải nghĩa trước khi xem đáp án nhé.</p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to={`/practice?idiom=${daily.data.id}`} className={buttonClass('primary')}>
                    <PenLine className="size-4" /> Thử giải nghĩa
                  </Link>
                  {!reveal && (
                    <button onClick={() => setReveal(true)} className={buttonClass('outline')}>
                      <Eye className="size-4" /> Xem nghĩa
                    </button>
                  )}
                  <Link to={`/idioms/${daily.data.id}`} className={buttonClass('ghost')}>
                    Chi tiết
                  </Link>
                </div>
              </>
            ) : (
              <Spinner />
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <Target className="size-4 text-brand-500" /> Mục tiêu hôm nay
          </div>
          {s && (
            <>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-serif text-4xl font-bold text-stone-900">{Math.min(s.todayCount, s.dailyGoal)}</span>
                <span className="text-stone-500">/ {s.dailyGoal} hoạt động</span>
              </div>
              <ProgressBar value={s.todayCount / s.dailyGoal} className="mt-3 h-2.5" />
              <p className="mt-3 text-sm text-stone-500">
                {s.todayCount >= s.dailyGoal
                  ? 'Tuyệt vời, bạn đã hoàn thành mục tiêu hôm nay!'
                  : 'Mỗi bài giải nghĩa, bài quiz hoặc thẻ ôn tập tính là một hoạt động.'}
              </p>
            </>
          )}
          <div className="mt-5 space-y-2">
            {ACTIONS.map(({ to, icon: Icon, title, text }) => (
              <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-stone-200 p-3 transition hover:border-brand-200 hover:bg-brand-50/40">
                <span className="rounded-lg bg-stone-100 p-2 text-stone-600 group-hover:bg-white group-hover:text-brand-600">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-900">{title}</span>
                  <span className="block truncate text-xs text-stone-500">{text}</span>
                </span>
                <ArrowRight className="size-4 text-stone-300 group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Bài giải nghĩa gần đây"
            action={
              <Link to="/progress" className="text-sm font-medium text-brand-600 hover:underline">
                Xem tất cả
              </Link>
            }
          />
          <div className="p-2">
            {history.data?.length ? (
              history.data.map((a) => (
                <Link key={a.id} to={`/idioms/${a.idiomId}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg font-serif font-bold', scoreTone(a.overall).soft)}>
                    {a.overall}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">{a.phrase}</span>
                    <span className="block text-xs text-stone-500">{formatRelative(a.createdAt)}</span>
                  </span>
                </Link>
              ))
            ) : history.isLoading ? (
              <Spinner />
            ) : (
              <EmptyState title="Chưa có bài nào" description="Hãy thử giải nghĩa câu đầu tiên của bạn." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Cần ôn lại" description="Những câu bạn đạt điểm thấp nhất" />
          <div className="p-2">
            {s?.weakIdioms.length ? (
              s.weakIdioms.map(({ idiom, bestScore }) => (
                <div key={idiom.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50">
                  <span className="min-w-0 flex-1">
                    <Link to={`/idioms/${idiom.id}`} className="block truncate text-sm font-medium text-stone-800 hover:text-brand-700">
                      {idiom.phrase}
                    </Link>
                    <span className="block text-xs text-stone-500">Điểm cao nhất: {bestScore}/5</span>
                  </span>
                  <Link to={`/practice?idiom=${idiom.id}`} className={buttonClass('outline', 'sm')}>
                    Luyện lại
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState title="Chưa có câu nào cần ôn" description="Các câu bạn đạt từ 2 điểm trở xuống sẽ hiện ở đây." />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
