import { Fragment } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { api } from '@/api'
import { Button, buttonClass } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { Tag } from '@/components/ui/Badge'
import { GlossaryList } from '@/components/idiom/GlossaryList'
import { DailyIdiomBox } from '@/components/idiom/DailyIdiomBox'
import { TOPICS, TRAITS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { normalize } from '@/lib/text'
import { VIVID } from '@/lib/vivid'
import { cn } from '@/lib/cn'

const log = createLogger('FLASHCARD')

function splitSenses(explanation: string): { sense: string; usage: string } {
  const [first, ...rest] = explanation.split(/(?<=[.!?])\s+/)
  return { sense: first, usage: rest.join(' ') }
}

export default function IdiomDetail() {
  const { id } = useParams()
  const idiomId = Number(id)
  const queryClient = useQueryClient()

  const { data: idiom, isLoading, error } = useQuery({
    queryKey: ['idiom', idiomId],
    queryFn: () => api.idioms.get(idiomId),
    meta: { tag: 'IDIOM' },
  })
  const neighbors = useQuery({
    queryKey: ['idiom', idiomId, 'neighbors'],
    queryFn: () => api.idioms.neighbors(idiomId),
    meta: { tag: 'IDIOM' },
  })
  const related = useQuery({
    queryKey: ['idioms', { topic: idiom?.topic, pageSize: 6 }],
    queryFn: () => api.idioms.list({ topic: idiom!.topic, pageSize: 6 }),
    enabled: !!idiom,
    meta: { tag: 'IDIOM' },
  })
  const save = useMutation({
    mutationFn: () => api.flashcards.saveIdiom(idiomId),
    meta: { tag: 'FLASHCARD' },
    onSuccess: (card) => {
      log.info('saved idiom', { idiomId, cardId: card.id })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
    },
  })

  if (isLoading) return <Spinner />
  if (error || !idiom) return <ErrorMessage error={error ?? new Error('Không tìm thấy')} />

  const { sense, usage } = splitSenses(idiom.explanation)
  const glossaryWords = new Set((idiom.glossary ?? []).flatMap((g) => normalize(g.term).split(' ')))
  const sections = [
    { id: 'nghia', label: 'Giải nghĩa', show: true },
    { id: 'tu', label: 'Chú giải từ', show: !!idiom.glossary?.length },
    { id: 'trich', label: 'Trích dẫn', show: !!idiom.citation },
    { id: 'dac-trung', label: 'Đặc trưng ngôn ngữ', show: idiom.traits.length > 0 },
    { id: 'lan-can', label: 'Câu lân cận', show: true },
    { id: 'nguon', label: 'Trích dẫn mục này', show: true },
  ].filter((s) => s.show)

  return (
    <div className="grid gap-8 lg:grid-cols-[10rem_minmax(0,1fr)_17rem]">
      <nav className="hidden lg:block">
        <div className="sticky top-20 space-y-1 text-sm">
          <Link to="/idioms" className="mb-3 block text-stone-500 hover:text-stone-800">
            ← Tra cứu
          </Link>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block border-l-2 border-stone-200 py-1 pl-3 text-stone-600 hover:border-stone-900 hover:text-stone-900">
              {s.label}
            </a>
          ))}
          <div className="pt-4">
            <Button variant="outline" size="sm" className="w-full" onClick={() => save.mutate()} loading={save.isPending} disabled={save.isSuccess}>
              {save.isSuccess && <Check className="size-4" />}
              {save.isSuccess ? 'Đã lưu' : 'Lưu vào bộ thẻ'}
            </Button>
          </div>
        </div>
      </nav>

      <article className="min-w-0">
        <header className="border-b border-stone-200 pb-5">
          <h1 className="font-serif text-3xl leading-tight font-bold text-stone-900 sm:text-4xl">{idiom.phrase}</h1>
          <p className="mt-2 text-sm text-stone-600">
            <Link to="/about" className="font-medium text-stone-900 hover:text-brand-700">
              VIVID #{idiom.id}
            </Link>{' '}
            · Chủ đề{' '}
            <Link to={`/idioms?topic=${idiom.topic}`} className="text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900">
              {TOPICS[idiom.topic].label}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/practice?idiom=${idiom.id}`} className={buttonClass('primary')}>
              Luyện viết câu này
            </Link>
            <Button variant="outline" className="lg:hidden" onClick={() => save.mutate()} loading={save.isPending} disabled={save.isSuccess}>
              {save.isSuccess ? 'Đã lưu vào bộ thẻ' : 'Lưu vào bộ thẻ'}
            </Button>
          </div>
        </header>

        <section id="nghia" className="scroll-mt-20 py-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900">Giải nghĩa</h2>
            <span className="text-xs text-stone-500">Giải nghĩa chuẩn trong VIVID</span>
          </div>
          <div className="flex gap-3 text-[17px] leading-relaxed">
            <span className="font-semibold text-stone-900">1</span>
            <p className="text-stone-800">
              <span className="font-semibold">: </span>
              {sense}
            </p>
          </div>
          {usage && <p className="mt-3 pl-6 text-[15px] leading-relaxed text-stone-700">{usage}</p>}
          {idiom.note && (
            <p className="mt-4 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">
              <span className="font-medium text-stone-900">Chú thích: </span>
              {idiom.note}
            </p>
          )}
        </section>

        {idiom.glossary && idiom.glossary.length > 0 && (
          <section id="tu" className="scroll-mt-20 border-t border-stone-200 py-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">Chú giải từ</h2>
              <span className="text-xs text-stone-500">Theo chú giải trong VIVID</span>
            </div>
            <p className="mt-3 mb-2 font-serif text-2xl text-stone-900">
              {idiom.phrase.split(' ').map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  <span className={cn(glossaryWords.has(normalize(word.replace(/[,.;]/g, ''))) && 'underline decoration-brand-400 decoration-2 underline-offset-[6px]')}>
                    {word}
                  </span>
                </Fragment>
              ))}
            </p>
            <GlossaryList items={idiom.glossary} />
          </section>
        )}

        {idiom.citation && (
          <section id="trich" className="scroll-mt-20 border-t border-stone-200 py-6">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">Trích dẫn</h2>
            <figure className="border-l-2 border-stone-300 pl-4">
              <blockquote className="font-serif text-[17px] leading-relaxed text-stone-800 italic">“{idiom.citation.text}”</blockquote>
              <figcaption className="mt-1 text-sm text-stone-500">— {idiom.citation.source}</figcaption>
            </figure>
          </section>
        )}

        {idiom.traits.length > 0 && (
          <section id="dac-trung" className="scroll-mt-20 border-t border-stone-200 py-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">Đặc trưng ngôn ngữ</h2>
              <Link to="/about#phan-loai" className="text-xs text-stone-500 hover:text-brand-700">
                Nhãn do chuyên gia gán trong VIVID
              </Link>
            </div>
            <dl className="space-y-3">
              {idiom.traits.map((t) => (
                <div key={t}>
                  <dt className="flex items-center gap-2 text-sm font-medium text-stone-900">
                    <Tag>{TRAITS[t].label}</Tag>
                    <span className="text-xs font-normal text-stone-500">Khía cạnh {TRAITS[t].aspect.toLowerCase()}</span>
                  </dt>
                  <dd className="mt-1 text-[15px] text-stone-700">{TRAITS[t].hint}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section id="lan-can" className="scroll-mt-20 border-t border-stone-200 py-6">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Câu lân cận</h2>
          <ul className="space-y-1.5 text-[15px]">
            {neighbors.data?.map((n) => (
              <li key={n.id}>
                {n.id === idiom.id ? (
                  <span className="font-semibold text-stone-900">{n.phrase}</span>
                ) : (
                  <Link to={`/idioms/${n.id}`} className="text-brand-700 hover:underline">
                    {n.phrase}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="nguon" className="scroll-mt-20 border-t border-stone-200 py-6">
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Trích dẫn mục này</h2>
          <p className="rounded-md bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-700">
            “{idiom.phrase}”, mục #{idiom.id}. Trong: {VIVID.authors.slice(0, 2).join(', ')} và cộng sự. {VIVID.title}. {VIVID.venue}.{' '}
            {VIVID.arxiv}. Dữ liệu phát hành theo giấy phép {VIVID.license}.
          </p>
        </section>
      </article>

      <aside className="space-y-6">
        <DailyIdiomBox />
        {related.data && related.data.items.filter((i) => i.id !== idiom.id).length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-stone-900">Cùng chủ đề {TOPICS[idiom.topic].label.toLowerCase()}</h2>
            <ul className="space-y-1.5 text-sm">
              {related.data.items
                .filter((i) => i.id !== idiom.id)
                .slice(0, 5)
                .map((i) => (
                  <li key={i.id}>
                    <Link to={`/idioms/${i.id}`} className="text-brand-700 hover:underline">
                      {i.phrase}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
