import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookmarkCheck, BookmarkPlus, Lightbulb, PenLine, Quote } from 'lucide-react'
import { api } from '@/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { IdiomBadges } from '@/components/idiom/IdiomBadges'
import { IdiomCard } from '@/components/idiom/IdiomCard'
import { TRAITS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('FLASHCARD')

export default function IdiomDetail() {
  const { id } = useParams()
  const idiomId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: idiom, isLoading, error } = useQuery({
    queryKey: ['idiom', idiomId],
    queryFn: () => api.idioms.get(idiomId),
    meta: { tag: 'IDIOM' },
  })
  const related = useQuery({
    queryKey: ['idioms', { topic: idiom?.topic, pageSize: 4 }],
    queryFn: () => api.idioms.list({ topic: idiom!.topic, pageSize: 4 }),
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

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" /> Quay lại
      </button>

      <Card className="relative overflow-hidden">
        <Quote className="pointer-events-none absolute top-4 right-4 size-24 text-gold-100" />
        <div className="relative p-6 sm:p-8">
          <IdiomBadges idiom={idiom} />
          <h1 className="mt-4 font-serif text-3xl leading-tight font-semibold text-stone-900 sm:text-4xl">{idiom.phrase}</h1>
          <div className="mt-6 border-l-4 border-brand-200 pl-4">
            <div className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Giải nghĩa</div>
            <p className="mt-1.5 text-lg leading-relaxed text-stone-700">{idiom.explanation}</p>
          </div>
          {idiom.example && (
            <div className="mt-5 rounded-xl bg-paper px-4 py-3">
              <div className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Ví dụ</div>
              <p className="mt-1 text-stone-700 italic">{idiom.example}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/practice?idiom=${idiom.id}`} className={buttonClass('primary')}>
              <PenLine className="size-4" /> Luyện giải nghĩa câu này
            </Link>
            <Button variant="outline" onClick={() => save.mutate()} loading={save.isPending} disabled={save.isSuccess}>
              {save.isSuccess ? <BookmarkCheck className="size-4 text-emerald-600" /> : <BookmarkPlus className="size-4" />}
              {save.isSuccess ? 'Đã lưu vào flashcard' : 'Lưu vào flashcard'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {idiom.glossary && idiom.glossary.length > 0 && (
          <Card>
            <CardHeader title="Từ khó" description="Giải thích các từ Hán Việt, từ cổ trong câu" />
            <dl className="divide-y divide-stone-100 p-5 pt-3">
              {idiom.glossary.map((g) => (
                <div key={g.term} className="flex gap-4 py-2.5">
                  <dt className="w-24 shrink-0 font-serif font-semibold text-brand-700">{g.term}</dt>
                  <dd className="text-sm text-stone-600">{g.meaning}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
        {idiom.traits.length > 0 && (
          <Card>
            <CardHeader title="Vì sao câu này khó?" description="Đặc trưng ngôn ngữ được gán nhãn trong VIVID" />
            <ul className="space-y-3 p-5 pt-3">
              {idiom.traits.map((t) => (
                <li key={t} className="flex gap-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-500" />
                  <div>
                    <div className="text-sm font-medium text-stone-800">
                      {TRAITS[t].label} <span className="font-normal text-stone-400">· {TRAITS[t].aspect}</span>
                    </div>
                    <p className="text-sm text-stone-500">{TRAITS[t].hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {related.data && related.data.items.filter((i) => i.id !== idiom.id).length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-900">Cùng chủ đề</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.data.items
              .filter((i) => i.id !== idiom.id)
              .slice(0, 3)
              .map((i) => (
                <IdiomCard key={i.id} idiom={i} />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
