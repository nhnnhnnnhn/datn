import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { Section } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Feedback'
import { CRITERIA, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { JUDGE_STRATEGIES, MODEL_RESULTS, TRAIT_RESULTS, VIVID } from '@/lib/vivid'

const TRAIT_EXAMPLES: Record<string, string> = {
  literal: 'Da đồng lông móc',
  pragmatic: 'Tốt mẽ khoe màu',
  sino_vietnamese: 'Ác khuất non đoài',
  uncommon_vocab: 'Am thanh cảnh vắng',
  folk_knowledge: 'Cấy tháng Chạp đạp không đổ',
}

const USAGE = [
  { part: '1.636 câu và giải nghĩa chuẩn', feature: 'Kho tra cứu; đáp án chuẩn để chấm bài luyện viết và bài tập', to: '/idioms' },
  { part: 'Chú giải từ, câu trích dẫn trong giải nghĩa', feature: 'Mục “Chú giải từ”, “Trích dẫn” ở trang mục từ; gợi ý bậc 2', to: '/idioms' },
  { part: '5 đặc trưng ngôn ngữ', feature: 'Bộ lọc, lưu ý khi học, mức thành thạo theo đặc trưng, bảng lớp học của giáo viên', to: '/progress' },
  { part: '7 chủ đề ngữ nghĩa', feature: 'Bộ lọc, bộ thẻ theo chủ đề', to: '/sets' },
  { part: 'Judge aspect-based 4 tiêu chí', feature: 'AI chấm bài luyện viết và bài tập theo đúng 4 tiêu chí, thang 0–5', to: '/practice' },
  { part: 'Phân tích lỗi của mô hình', feature: 'Nhóm góp ý: hiểu nghĩa đen, hiểu sai từ, mất sắc thái, suy diễn nghĩa bóng', to: '/practice' },
  { part: 'Hai nhiệm vụ phân biệt', feature: 'Dạng câu hỏi “Phân loại chủ đề” và “Nhận diện đặc trưng” trong trắc nghiệm', to: '/quiz' },
]

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2.5 w-full rounded-sm bg-stone-100">
      <div className="h-full rounded-sm bg-stone-800" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

function bibtex() {
  return [
    '@inproceedings{do2026vivid,',
    `  title     = {${VIVID.title}},`,
    `  author    = {${VIVID.authors.join(' and ')}},`,
    `  booktitle = {${VIVID.venue}},`,
    '  year      = {2026},',
    `  note      = {${VIVID.arxiv}}`,
    '}',
  ].join('\n')
}

export default function About() {
  const stats = useQuery({ queryKey: ['idioms', 'stats'], queryFn: api.idioms.stats, meta: { tag: 'IDIOM' } })
  const [showBib, setShowBib] = useState(false)
  const s = stats.data

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header>
        <p className="text-sm font-medium text-brand-700">Nền tảng của VIVID Learn</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Về bộ dữ liệu VIVID</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-stone-700">
          VIVID ({VIVID.expansion}) là bộ dữ liệu đầu tiên dùng để đánh giá khả năng hiểu thành ngữ, tục ngữ tiếng Việt có gắn với văn hoá.
          Toàn bộ kho câu, giải nghĩa chuẩn, nhãn đặc trưng và tiêu chí chấm trong ứng dụng này đều lấy từ VIVID.
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 p-4">
          <p className="font-medium text-stone-900">{VIVID.title}</p>
          <p className="mt-1 text-sm text-stone-600">{VIVID.authors.join(', ')}</p>
          <p className="text-sm text-stone-500">
            {VIVID.affiliations} · {VIVID.venue}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href={VIVID.arxivUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
              Bài báo ({VIVID.arxiv})
            </a>
            <a href={VIVID.repoUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
              Mã nguồn và dữ liệu (GitHub)
            </a>
            <span className="text-stone-500">Giấy phép {VIVID.license}</span>
            <Button variant="ghost" size="sm" onClick={() => setShowBib((v) => !v)}>
              {showBib ? 'Ẩn BibTeX' : 'BibTeX'}
            </Button>
          </div>
          {showBib && <pre className="mt-3 overflow-x-auto rounded-md bg-stone-50 p-3 text-xs text-stone-800">{bibtex()}</pre>}
        </div>
      </header>

      <Section title="Cách xây dựng bộ dữ liệu">
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: VIVID.collectedPairs.toLocaleString('vi-VN'),
              title: 'Thu thập',
              text: 'Cặp câu–giải nghĩa từ từ điển của Nguyễn Lân (2010) và Vũ Dung cùng cộng sự (2000), gồm cả dạng chuẩn lẫn biến thể vùng miền.',
            },
            { n: 'GPT-4.1', title: 'Gán nhãn tự động', text: 'Mỗi câu được gán sơ bộ các đặc trưng gây khó cho mô hình ngôn ngữ.' },
            {
              n: VIVID.releasedPairs.toLocaleString('vi-VN'),
              title: 'Chuyên gia kiểm duyệt',
              text: `Hai người bản ngữ chuyên ngôn ngữ học duyệt độc lập; chỉ giữ câu đạt đồng thuận (κ giữa hai người = ${VIVID.humanKappa.toLocaleString('vi-VN')}).`,
            },
          ].map((step, i) => (
            <li key={step.title} className="border-l-2 border-stone-300 pl-4">
              <p className="text-xs text-stone-500">Bước {i + 1}</p>
              <p className="text-2xl font-semibold text-stone-900">{step.n}</p>
              <p className="mt-1 text-sm font-medium text-stone-900">{step.title}</p>
              <p className="mt-1 text-sm text-stone-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section id="phan-loai" className="scroll-mt-20">
        <Section title="Phân loại hai lớp" count={s ? `${s.total.toLocaleString('vi-VN')} câu` : undefined}>
          <p className="mb-4 text-sm text-stone-600">
            Mỗi câu mang một hoặc nhiều trong 5 đặc trưng ngôn ngữ (3 khía cạnh) và thuộc đúng một trong 7 chủ đề. Số lượng dưới đây được tính trực tiếp từ dữ liệu phát hành.
          </p>
          {!s ? (
            <Spinner />
          ) : (
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">5 đặc trưng ngôn ngữ</h3>
                <ul className="space-y-3">
                  {TRAIT_IDS.map((t) => (
                    <li key={t}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-stone-900">
                          {TRAITS[t].label} <span className="font-normal text-stone-500">· {TRAITS[t].aspect}</span>
                        </span>
                        <span className="text-stone-700 tabular-nums">
                          {s.byTrait[t]} ({Math.round((s.byTrait[t] / s.total) * 1000) / 10}%)
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Bar value={s.byTrait[t]} max={s.total} />
                      </div>
                      <p className="mt-1 text-xs text-stone-500">VD trong bài báo: {TRAIT_EXAMPLES[t]}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">7 chủ đề</h3>
                <ul className="space-y-3">
                  {[...TOPIC_IDS]
                    .sort((a, b) => s.byTopic[b] - s.byTopic[a])
                    .map((t) => (
                      <li key={t}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <Link to={`/idioms?topic=${t}`} className="font-medium text-stone-900 hover:text-brand-700">
                            {TOPICS[t].label}
                          </Link>
                          <span className="text-stone-700 tabular-nums">
                            {s.byTopic[t]} ({Math.round((s.byTopic[t] / s.total) * 1000) / 10}%)
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <Bar value={s.byTopic[t]} max={s.total} />
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </Section>
      </section>

      <Section title="Phương pháp chấm: LLM-as-a-Judge theo khía cạnh">
        <p className="text-[15px] leading-relaxed text-stone-700">
          Bài báo so sánh 4 cách viết prompt cho mô hình chấm (GPT-4.1) với điểm của người. Cách chấm theo khía cạnh cho mức đồng thuận cao nhất, nên
          VIVID Learn dùng đúng 4 tiêu chí này để chấm bài của học sinh:
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {CRITERIA.map(({ key, label, hint, color }, i) => (
            <li key={key} className="flex gap-3 rounded-md border border-stone-200 p-3">
              <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {i + 1}. {label}
                </p>
                <p className="text-sm text-stone-600">{hint}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-stone-600">Mỗi tiêu chí 0–5 điểm. Nếu ý nghĩa cốt lõi được 0 điểm thì điểm tổng bằng 0.</p>
        <table className="mt-5 w-full max-w-md text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500">
              <th className="py-1.5 font-medium">Cách prompt</th>
              <th className="py-1.5 text-right font-medium">Điểm TB</th>
              <th className="py-1.5 text-right font-medium">Cohen’s κ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 tabular-nums">
            <tr>
              <td className="py-1.5 text-stone-600">Người chấm (mốc)</td>
              <td className="py-1.5 text-right text-stone-600">3,47</td>
              <td className="py-1.5 text-right text-stone-600">1,000</td>
            </tr>
            {JUDGE_STRATEGIES.map((j) => (
              <tr key={j.name} className={j.name === 'Aspect-based' ? 'font-semibold text-stone-900' : 'text-stone-700'}>
                <td className="py-1.5">{j.name}</td>
                <td className="py-1.5 text-right">{j.mean.toLocaleString('vi-VN')}</td>
                <td className="py-1.5 text-right">{j.kappa.toLocaleString('vi-VN', { minimumFractionDigits: 3 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-500">Nguồn: Bảng 1 trong bài báo.</p>
      </Section>

      <Section title="Mô hình ngôn ngữ vẫn còn kém ở thành ngữ Việt">
        <p className="mb-4 text-[15px] leading-relaxed text-stone-700">
          Tám mô hình được yêu cầu giải nghĩa các câu trong VIVID rồi chấm theo thang 0–5. Mô hình tốt nhất cũng chưa đạt một nửa số điểm, và các mô hình
          chuyên tiếng Việt cỡ nhỏ còn kém hơn. Vì vậy VIVID Learn luôn đối chiếu với giải nghĩa chuẩn đã được chuyên gia duyệt, thay vì để mô hình tự
          đưa ra đáp án.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="py-1.5 font-medium">Mô hình</th>
                <th className="py-1.5 font-medium">Nhóm</th>
                <th className="w-2/5 py-1.5 font-medium">Zero-shot (0–5)</th>
                <th className="py-1.5 text-right font-medium">Few-shot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {MODEL_RESULTS.map((m) => (
                <tr key={m.model}>
                  <td className="py-2 text-stone-900">{m.model}</td>
                  <td className="py-2 text-stone-500">{m.group}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Bar value={m.zeroShot} max={5} />
                      </div>
                      <span className="w-9 text-right text-stone-800">{m.zeroShot.toLocaleString('vi-VN')}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-stone-600">{m.fewShot.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">Nguồn: Bảng 3 trong bài báo (điểm trung bình trên mọi chủ đề).</p>

        <h3 className="mt-8 mb-2 text-sm font-semibold text-stone-900">Hai mô hình mạnh nhất theo từng đặc trưng (zero-shot)</h3>
        <table className="w-full max-w-lg text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500">
              <th className="py-1.5 font-medium">Đặc trưng</th>
              <th className="py-1.5 text-right font-medium">GPT-4o</th>
              <th className="py-1.5 text-right font-medium">Gemini Flash 2.5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 tabular-nums">
            {TRAIT_RESULTS.map((r) => (
              <tr key={r.trait}>
                <td className="py-1.5 text-stone-800">{TRAITS[r.trait].label}</td>
                <td className="py-1.5 text-right text-stone-700">{r.gpt4o.toLocaleString('vi-VN')}</td>
                <td className="py-1.5 text-right text-stone-700">{r.gemini.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-500">Nguồn: Bảng 4 trong bài báo.</p>
      </Section>

      <Section title="VIVID được dùng ở đâu trong ứng dụng">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="w-2/5 py-2 font-medium">Thành phần của VIVID</th>
                <th className="py-2 font-medium">Tính năng trong VIVID Learn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {USAGE.map((u) => (
                <tr key={u.part}>
                  <td className="py-2.5 pr-4 align-top font-medium text-stone-900">{u.part}</td>
                  <td className="py-2.5 align-top text-stone-700">
                    {u.feature}{' '}
                    <Link to={u.to} className="text-brand-700 hover:underline">
                      Mở
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s && (
          <p className="mt-3 text-sm text-stone-500">
            Trong dữ liệu có {s.withGlossary} câu kèm chú giải từ và {s.withCitation} câu kèm câu trích dẫn (ca dao, Truyện Kiều…), được tách ra tự động khi
            nhập dữ liệu.
          </p>
        )}
      </Section>
    </div>
  )
}
