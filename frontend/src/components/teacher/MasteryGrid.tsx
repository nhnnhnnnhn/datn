import type { ClassReport } from '@/types'
import { MASTERY, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { masteryFromScore } from '@/lib/mastery'

export function MasteryGrid({ report }: { report: ClassReport }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-44" />
          {TRAIT_IDS.map((t) => (
            <col key={t} />
          ))}
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="bg-stone-50 text-left text-xs text-stone-600">
            <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 font-medium">Học sinh</th>
            {TRAIT_IDS.map((t) => (
              <th key={t} className="px-1 py-2 text-center font-medium" title={TRAITS[t].hint}>
                {TRAITS[t].label}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Điểm TB</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map(({ student, mastery }) => (
            <tr key={student.id} className="border-t border-stone-100">
              <td className="sticky left-0 z-10 bg-white px-3 py-1.5 whitespace-nowrap text-stone-800">{student.name}</td>
              {TRAIT_IDS.map((t) => {
                const cell = mastery[t]
                const style = MASTERY[cell.level]
                return (
                  <td key={t} className="p-[2px]">
                    <div
                      className="flex h-8 items-center justify-center rounded-[3px] text-xs font-medium tabular-nums"
                      style={{ backgroundColor: style.color, color: style.ink }}
                      title={`${student.name} · ${TRAITS[t].label}: ${style.label}${cell.avgScore != null ? `, TB ${cell.avgScore.toFixed(1)} (${cell.attempts} bài)` : ''}`}
                    >
                      {cell.avgScore != null ? cell.avgScore.toFixed(1) : '–'}
                    </div>
                  </td>
                )
              })}
              <td className="px-3 py-1.5 text-right text-stone-700 tabular-nums">{student.avgScore != null ? student.avgScore.toFixed(1) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-200 bg-stone-50 font-medium">
            <td className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-stone-900">Trung bình lớp</td>
            {TRAIT_IDS.map((t) => {
              const value = report.traitAverages[t]
              const style = MASTERY[masteryFromScore(value)]
              return (
                <td key={t} className="p-[2px]">
                  <div className="flex h-8 items-center justify-center rounded-[3px] text-xs tabular-nums" style={{ backgroundColor: style.color, color: style.ink }}>
                    {value != null ? value.toFixed(1) : '–'}
                  </div>
                </td>
              )
            })}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
