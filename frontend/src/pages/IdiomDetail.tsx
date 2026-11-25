import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { api } from '@/api'
import { Button, buttonClass } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { Tag } from '@/components/ui/Badge'
import { TOPICS, TRAITS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('FLASHCARD')

export default function IdiomDetail() {
  const { id } = useParams()
  const idiomId = Number(id)
  const queryClient = useQueryClient()

  const { data: idiom, isLoading, error } = useQuery({
    queryKey: ['idiom', idiomId],
    queryFn: () => api.idioms.get(idiomId),
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

  const sections = [
    { id: 'nghia', label: 'Giải nghĩa', show: true },
    { id: 'dac-trung', label: 'Đặc trưng ngôn ngữ', show: idiom.traits.length > 0 },
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
            Chủ đề{' '}
            <Link to={`/idioms?topic=${idiom.topic}`} className="text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900">
              {TOPICS[idiom.topic].label}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/practice?idiom=${idiom.id}`} className={buttonClass('primary')}>
              Luyện viết
            </Link>
            <Button variant="outline" className="lg:hidden" onClick={() => save.mutate()} loading={save.isPending} disabled={save.isSuccess}>
              {save.isSuccess ? 'Đã lưu vào bộ thẻ' : 'Lưu vào bộ thẻ'}
            </Button>
          </div>
        </header>

        <section id="nghia" className="scroll-mt-20 py-6">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Giải nghĩa</h2>
          <p className="text-[17px] leading-relaxed text-stone-800">{idiom.explanation}</p>
        </section>

        {idiom.traits.length > 0 && (
          <section id="dac-trung" className="scroll-mt-20 border-t border-stone-200 py-6">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">Đặc trưng ngôn ngữ</h2>
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
      </article>

      <aside className="space-y-6">
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
