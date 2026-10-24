import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Lightbulb } from 'lucide-react'
import type { ActivityDay } from '@/types'
import { api } from '@/api'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { scoreTone } from '@/components/ui/ScoreRing'
import { TOPICS, TRAITS } from '@/lib/constants'
import { cn } from '@/lib/cn'

const AXIS = { stroke: '#a8a29e', fontSize: 12 }
const GRID = '#ece9e4'
const SCORE_HUE = '#b93a2e'
const MASTERY_HUE = '#047857'
const TRAIT_HUE = '#bd6e1b'
// Single-hue ramp, validated for contrast against the card surface
const HEAT = ['#f0ede8', '#10b981', '#047857', '#065f46', '#022c22']

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { value: number | null }[]; label?: string; format: (v: number, label: string) => string }) {
  if (!active || !payload?.length || payload[0].value == null) return null
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <span className="text-stone-700">{format(payload[0].value, label ?? '')}</span>
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-stone-500">{sub}</div>}
    </Card>
  )
}

const shortDate = (key: string) => {
  const [, m, d] = key.split('-')
  return `${Number(d)}/${Number(m)}`
}

export default function Progress() {
  const summary = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  const history = useQuery({ queryKey: ['grading', 'history', 15], queryFn: () => api.grading.history(15), meta: { tag: 'GRADING' } })

  if (summary.error) return <ErrorMessage error={summary.error} />
  if (!summary.data) return <Spinner />
  const s = summary.data

  const topicData = s.byTopic.map((t) => ({
    name: TOPICS[t.topic].label,
    pct: t.total ? Math.round((t.learned / t.total) * 100) : 0,
    label: `${t.learned}/${t.total}`,
  }))
  const traitData = s.byTrait.map((t) => ({
    name: TRAITS[t.trait].label,
    score: t.avgScore != null ? Number(t.avgScore.toFixed(2)) : 0,
    label: t.avgScore != null ? t.avgScore.toFixed(1) : '—',
    attempts: t.attempts,
  }))
  const weakestTrait = s.byTrait.filter((t) => t.avgScore != null).sort((a, b) => a.avgScore! - b.avgScore!)[0]
  const hasScores = s.scoreHistory.some((p) => p.value != null)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Tiến độ học tập" description="Tổng hợp kết quả luyện giải nghĩa, quiz và ôn flashcard của bạn." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatTile label="Đã học" value={`${s.studiedCount}`} sub={`trên ${s.totalIdioms} câu`} />
        <StatTile label="Đã thuộc" value={`${s.learnedCount}`} sub="điểm ≥ 4 hoặc nhớ thẻ" />
        <StatTile label="Điểm giải nghĩa TB" value={s.avgScore != null ? s.avgScore.toFixed(2) : '—'} sub={`${s.practiceCount} bài`} />
        <StatTile label="Độ chính xác quiz" value={s.quizAccuracy != null ? `${Math.round(s.quizAccuracy * 100)}%` : '—'} sub={`${s.quizCount} lượt làm`} />
        <StatTile label="Chuỗi ngày học" value={`${s.streak}`} sub={`${s.reviewCount} lượt ôn thẻ`} />
      </div>

      <Card>
        <CardHeader title="Điểm giải nghĩa trung bình theo ngày" description="30 ngày gần nhất · thang điểm 0–5" />
        <div className="h-64 px-2 pt-4 pb-3">
          {hasScores ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.scoreHistory} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: '#d6d3d1', strokeWidth: 1 }}
                  content={<ChartTooltip format={(v, l) => `${shortDate(l)}: ${v.toFixed(1)} điểm`} />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={SCORE_HUE}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 4, fill: SCORE_HUE, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: SCORE_HUE, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Chưa có dữ liệu điểm" description="Luyện giải nghĩa để thấy biểu đồ tiến bộ." />
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mức độ thành thạo theo chủ đề" description="Tỉ lệ câu đã thuộc trong mỗi chủ đề" />
          <div className="h-72 px-2 pt-3 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ ...AXIS, fill: '#57534e' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f5f5f4' }} content={<ChartTooltip format={(v, l) => `${l}: ${v}% đã thuộc`} />} />
                <Bar dataKey="pct" fill={MASTERY_HUE} radius={[0, 4, 4, 0]} maxBarSize={20}>
                  <LabelList dataKey="label" position="right" style={{ fill: '#57534e', fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Điểm theo đặc trưng ngôn ngữ" description="Điểm giải nghĩa TB với các câu mang từng đặc trưng (taxonomy VIVID)" />
          <div className="h-56 px-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={traitData} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ ...AXIS, fill: '#57534e' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f5f5f4' }} content={<ChartTooltip format={(v, l) => `${l}: ${v.toFixed(2)} / 5`} />} />
                <Bar dataKey="score" fill={TRAIT_HUE} radius={[0, 4, 4, 0]} maxBarSize={20}>
                  <LabelList dataKey="label" position="right" style={{ fill: '#57534e', fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {weakestTrait && (
            <div className="mx-5 mb-5 flex gap-2 rounded-xl bg-gold-50 p-3 text-sm text-gold-800">
              <Lightbulb className="mt-0.5 size-4 shrink-0" />
              <span>
                Bạn đang yếu nhất ở nhóm <b>{TRAITS[weakestTrait.trait].label}</b>. {TRAITS[weakestTrait.trait].hint}{' '}
                <Link to="/flashcards" className="font-medium underline">
                  Tạo bộ thẻ ôn tập
                </Link>
              </span>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Hoạt động học tập" description="12 tuần gần nhất · mỗi ô là một ngày" />
        <div className="p-5">
          <Heatmap days={s.activity} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Lịch sử chấm giải nghĩa" description="15 bài gần nhất" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-stone-100 bg-stone-50/60 text-left text-xs text-stone-500">
                <th className="px-5 py-2.5 font-medium">Câu</th>
                <th className="px-3 py-2.5 text-center font-medium">Cốt lõi</th>
                <th className="px-3 py-2.5 text-center font-medium">Sắc thái</th>
                <th className="px-3 py-2.5 text-center font-medium">Diễn đạt</th>
                <th className="px-3 py-2.5 text-center font-medium">Đầy đủ</th>
                <th className="px-3 py-2.5 text-center font-medium">Tổng</th>
                <th className="px-5 py-2.5 text-right font-medium">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {history.data?.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50/60">
                  <td className="max-w-[16rem] truncate px-5 py-2.5">
                    <Link to={`/idioms/${a.idiomId}`} className="font-medium text-stone-800 hover:text-brand-700">
                      {a.phrase}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center text-stone-600">{a.scores.accuracy}</td>
                  <td className="px-3 py-2.5 text-center text-stone-600">{a.scores.nuance}</td>
                  <td className="px-3 py-2.5 text-center text-stone-600">{a.scores.fluency}</td>
                  <td className="px-3 py-2.5 text-center text-stone-600">{a.scores.completeness}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('inline-flex size-7 items-center justify-center rounded-md font-semibold', scoreTone(a.overall).soft)}>{a.overall}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right text-stone-500">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Heatmap({ days }: { days: ActivityDay[] }) {
  // pad the first column so weeks start on Monday
  const first = new Date(days[0].date)
  const offset = (first.getDay() + 6) % 7
  const cells: (ActivityDay | null)[] = [...Array(offset).fill(null), ...days]
  const weeks: (ActivityDay | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4)
  const activeDays = days.filter((d) => d.count > 0).length

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="grid shrink-0 grid-rows-7 gap-1 pt-0 text-[10px] text-stone-400">
          {['T2', '', 'T4', '', 'T6', '', 'CN'].map((d, i) => (
            <span key={i} className="flex h-3.5 items-center sm:h-4">
              {d}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-rows-7 gap-1">
              {week.map((day, di) =>
                day ? (
                  <div
                    key={di}
                    title={`${new Date(day.date).toLocaleDateString('vi-VN')}: ${day.count} hoạt động`}
                    className="size-3.5 rounded-[3px] sm:size-4"
                    style={{ backgroundColor: HEAT[level(day.count)] }}
                  />
                ) : (
                  <div key={di} className="size-3.5 sm:size-4" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>{activeDays} ngày có hoạt động</span>
        <span className="flex items-center gap-1">
          Ít
          {HEAT.map((c) => (
            <span key={c} className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          Nhiều
        </span>
      </div>
    </div>
  )
}
