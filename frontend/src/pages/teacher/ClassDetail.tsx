import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { buttonClass } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { MasteryGrid } from '@/components/teacher/MasteryGrid'
import { MasteryLegend } from '@/components/progress/MasteryLegend'
import { TRAITS, TRAIT_IDS } from '@/lib/constants'
import { dueLabel } from '@/lib/dueLabel'
import { formatRelative } from '@/lib/text'

type Tab = 'work' | 'mastery' | 'people'

export default function ClassDetail() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab | null) ?? 'work'

  const cls = useQuery({ queryKey: ['class', id], queryFn: () => api.classes.get(id), meta: { tag: 'CLASS' } })
  const assignments = useQuery({ queryKey: ['assignments', 'class', id], queryFn: () => api.assignments.list(id), meta: { tag: 'ASSIGNMENT' } })
  const report = useQuery({ queryKey: ['class', id, 'report'], queryFn: () => api.classes.report(id), enabled: tab === 'mastery', meta: { tag: 'CLASS' } })
  const students = useQuery({ queryKey: ['class', id, 'students'], queryFn: () => api.classes.students(id), enabled: tab === 'people', meta: { tag: 'CLASS' } })

  if (cls.error) return <ErrorMessage error={cls.error} />
  if (!cls.data) return <Spinner />
  const c = cls.data

  const weakest = report.data
    ? TRAIT_IDS.filter((t) => report.data.traitAverages[t] != null).sort((a, b) => report.data.traitAverages[a]! - report.data.traitAverages[b]!)[0]
    : undefined

  return (
    <div>
      <Link to="/teacher" className="text-sm text-stone-500 hover:text-stone-800">
        ← Lớp học
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{c.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {c.studentCount} học sinh · Mã lớp <span className="font-mono text-stone-800">{c.code}</span>
          </p>
        </div>
        <Link to={`/teacher/assignments/new?classId=${c.id}`} className={buttonClass('dark')}>
          Giao bài mới
        </Link>
      </div>

      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'work', label: 'Bài tập' },
          { value: 'mastery', label: 'Mức độ thành thạo' },
          { value: 'people', label: 'Học sinh' },
        ]}
      />

      <div className="mt-6">
        {tab === 'work' &&
          (!assignments.data ? (
            <Spinner />
          ) : assignments.data.length === 0 ? (
            <EmptyState title="Chưa giao bài nào" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {assignments.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <Link to={`/teacher/assignments/${a.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                      {a.title}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {a.idiomIds.length} câu · {dueLabel(a.dueAt)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-stone-900 tabular-nums">
                      {a.submittedCount}/{a.studentCount}
                    </p>
                    <p className="text-xs text-stone-500">đã nộp</p>
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'mastery' &&
          (!report.data ? (
            <Spinner />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-stone-600">Điểm trung bình bài viết của từng học sinh theo 5 đặc trưng ngôn ngữ của VIVID.</p>
                <MasteryLegend />
              </div>
              {weakest && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <p className="text-stone-800">
                    Cả lớp yếu nhất ở <span className="font-semibold">{TRAITS[weakest].label}</span> (TB {report.data.traitAverages[weakest]!.toFixed(1)}).
                  </p>
                  <Link to={`/teacher/assignments/new?classId=${c.id}&trait=${weakest}`} className="font-medium text-brand-700 hover:underline">
                    Giao bài luyện nhóm này
                  </Link>
                </div>
              )}
              <MasteryGrid report={report.data} />
            </div>
          ))}

        {tab === 'people' &&
          (!students.data ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-500">
                    <th className="py-2 font-medium">Học sinh</th>
                    <th className="py-2 font-medium">Email</th>
                    <th className="py-2 text-right font-medium">Bài viết</th>
                    <th className="py-2 text-right font-medium">Điểm TB</th>
                    <th className="py-2 text-right font-medium">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {students.data.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 text-stone-900">{s.name}</td>
                      <td className="py-2 text-stone-500">{s.email}</td>
                      <td className="py-2 text-right text-stone-700 tabular-nums">{s.attempts}</td>
                      <td className="py-2 text-right text-stone-700 tabular-nums">{s.avgScore != null ? s.avgScore.toFixed(1) : '—'}</td>
                      <td className="py-2 text-right text-stone-500">{s.lastActiveAt ? formatRelative(s.lastActiveAt) : 'Chưa hoạt động'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  )
}
