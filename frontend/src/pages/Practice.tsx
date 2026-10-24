import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookmarkCheck,
  BookmarkPlus,
  CircleCheck,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react'
import type { GradingResult, Idiom, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Field'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { ScoreRing, scoreTone } from '@/components/ui/ScoreRing'
import { Badge } from '@/components/ui/Badge'
import { CRITERIA, ERROR_TYPES, KINDS, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS, USE_MOCK } from '@/lib/constants'
import { syllables } from '@/lib/text'
import { cn } from '@/lib/cn'
import { createLogger } from '@/lib/logger'

const gradingLog = createLogger('GRADING')
const flashcardLog = createLogger('FLASHCARD')

export default function Practice() {
  const [params, setParams] = useSearchParams()
  const idiomParam = params.get('idiom')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>('')

  const next = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < 5; i++) {
        const idiom = await api.idioms.random({ topic: topic || undefined, trait: trait || undefined })
        if (String(idiom.id) !== idiomParam) return idiom
      }
      return api.idioms.random({ topic: topic || undefined, trait: trait || undefined })
    },
    meta: { tag: 'IDIOM' },
    onSuccess: (idiom) => setParams({ idiom: String(idiom.id) }, { replace: !idiomParam }),
  })

  const { mutate: pickNext } = next
  useEffect(() => {
    if (!idiomParam) pickNext()
  }, [idiomParam, pickNext])

  const idiomQuery = useQuery({
    queryKey: ['idiom', Number(idiomParam)],
    queryFn: () => api.idioms.get(Number(idiomParam)),
    enabled: !!idiomParam,
    meta: { tag: 'IDIOM' },
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Luyện giải nghĩa"
        description="Viết lời giải nghĩa bằng lời của bạn. AI chấm theo 4 tiêu chí (thang 0–5) và chỉ ra chỗ cần cải thiện."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="w-40">
              <Select value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')} aria-label="Chủ đề">
                <option value="">Mọi chủ đề</option>
                {TOPIC_IDS.map((t) => (
                  <option key={t} value={t}>
                    {TOPICS[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select value={trait} onChange={(e) => setTrait(e.target.value as TraitId | '')} aria-label="Đặc trưng">
                <option value="">Mọi đặc trưng</option>
                {TRAIT_IDS.map((t) => (
                  <option key={t} value={t}>
                    {TRAITS[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={() => next.mutate()} loading={next.isPending}>
              <Shuffle className="size-4" /> Câu khác
            </Button>
          </div>
        }
      />

      {idiomQuery.error ? (
        <ErrorMessage error={idiomQuery.error} />
      ) : idiomQuery.data ? (
        <PracticeSession key={idiomQuery.data.id} idiom={idiomQuery.data} onNext={() => next.mutate()} nextLoading={next.isPending} />
      ) : (
        <Spinner />
      )}
    </div>
  )
}

function PracticeSession({ idiom, onNext, nextLoading }: { idiom: Idiom; onNext: () => void; nextLoading: boolean }) {
  const queryClient = useQueryClient()
  const [answer, setAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const grade = useMutation({
    mutationFn: () => api.grading.grade(idiom.id, answer),
    meta: { tag: 'GRADING' },
    onMutate: () => gradingLog.debug('grading started', { idiomId: idiom.id, chars: answer.length }),
    onSuccess: (result) => {
      gradingLog.info('graded answer', {
        idiomId: idiom.id,
        attemptId: result.id,
        overall: result.overall,
        errorTypes: result.feedback.errorTypes,
      })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['grading'] })
      // on mobile the result panel sits below the fold
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    },
  })
  const save = useMutation({
    mutationFn: () => api.flashcards.saveIdiom(idiom.id),
    meta: { tag: 'FLASHCARD' },
    onSuccess: (card) => {
      flashcardLog.info('saved idiom', { idiomId: idiom.id, cardId: card.id })
      queryClient.invalidateQueries({ queryKey: ['decks'] })
    },
  })

  const words = syllables(answer).length
  const canSubmit = words >= 1 && !grade.isPending
  const result = grade.data

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-gold-50 text-gold-700 ring-gold-200">{KINDS[idiom.kind]}</Badge>
            {idiom.traits.length > 0 && (
              <button onClick={() => setShowHint((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                <Lightbulb className="size-3.5" /> {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
              </button>
            )}
          </div>
          <h2 className="mt-3 font-serif text-2xl leading-snug font-semibold text-stone-900 sm:text-3xl">“{idiom.phrase}”</h2>

          {showHint && (
            <div className="mt-4 animate-fade-in space-y-2 rounded-xl bg-gold-50 p-4 text-sm">
              {idiom.traits.map((t) => (
                <p key={t} className="text-gold-800">
                  <span className="font-semibold">{TRAITS[t].label}:</span> {TRAITS[t].hint}
                </p>
              ))}
              {idiom.glossary?.map((g) => (
                <p key={g.term} className="text-gold-800">
                  <span className="font-semibold">“{g.term}”</span>: {g.meaning}
                </p>
              ))}
            </div>
          )}

          <div className="mt-5">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) grade.mutate()
              }}
              rows={6}
              placeholder="Câu này có nghĩa là… (nêu ý nghĩa bóng, thái độ khen/chê, bài học rút ra)"
              disabled={grade.isPending || !!result}
              aria-label="Lời giải nghĩa của bạn"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-stone-400">
                {words} tiếng · <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Enter</kbd> để nộp
              </span>
              {result ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => grade.reset()}>
                    <RotateCcw className="size-4" /> Viết lại
                  </Button>
                  <Button onClick={onNext} loading={nextLoading}>
                    Câu tiếp theo
                  </Button>
                </div>
              ) : (
                <Button onClick={() => grade.mutate()} disabled={!canSubmit} loading={grade.isPending}>
                  <WandSparkles className="size-4" /> {grade.isPending ? 'AI đang chấm…' : 'Chấm điểm'}
                </Button>
              )}
            </div>
            {grade.error && (
              <div className="mt-3">
                <ErrorMessage error={grade.error} />
              </div>
            )}
          </div>
        </Card>

        {result && (
          <Card className="animate-fade-in p-6">
            <div className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Giải nghĩa chuẩn (VIVID)</div>
            <p className="mt-1.5 leading-relaxed text-stone-700">{result.reference}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={save.isSuccess}>
                {save.isSuccess ? <BookmarkCheck className="size-4 text-emerald-600" /> : <BookmarkPlus className="size-4" />}
                {save.isSuccess ? 'Đã lưu' : 'Lưu vào flashcard'}
              </Button>
              <Link to={`/idioms/${idiom.id}`} className="inline-flex h-8 items-center px-2 text-sm font-medium text-brand-600 hover:underline">
                Xem chi tiết câu
              </Link>
            </div>
          </Card>
        )}
      </div>

      <div ref={resultRef} className="scroll-mt-20 lg:col-span-2">
        {grade.isPending ? (
          <Card className="flex flex-col items-center px-6 py-14 text-center">
            <Sparkles className="size-8 animate-pulse text-gold-500" />
            <p className="mt-3 font-medium text-stone-800">AI đang chấm bài…</p>
            <p className="mt-1 text-sm text-stone-500">So sánh với giải nghĩa chuẩn theo 4 tiêu chí</p>
          </Card>
        ) : result ? (
          <GradingPanel result={result} />
        ) : (
          <RubricGuide />
        )}
      </div>
    </div>
  )
}

function GradingPanel({ result }: { result: GradingResult }) {
  const { feedback } = result
  return (
    <Card className="animate-fade-in overflow-hidden">
      <div className="flex flex-col items-center gap-4 border-b border-stone-100 bg-paper/60 p-6 text-center xl:flex-row xl:text-left">
        <ScoreRing score={result.overall} />
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Điểm tổng</div>
          <p className="mt-1 font-medium leading-snug text-stone-800">{feedback.summary}</p>
        </div>
      </div>

      <div className="space-y-3 p-6">
        {CRITERIA.map(({ key, label, hint }) => {
          const v = result.scores[key]
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-stone-700" title={hint}>
                  {label}
                </span>
                <span className={cn('font-semibold', scoreTone(v).text)}>{v}/5</span>
              </div>
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={cn('h-1.5 flex-1 rounded-full', i <= v ? scoreTone(v).bg : 'bg-stone-100')} />
                ))}
              </div>
            </div>
          )
        })}
        {result.scores.accuracy === 0 && (
          <p className="text-xs text-stone-500">Ý nghĩa cốt lõi được 0 điểm nên điểm tổng bằng 0.</p>
        )}
      </div>

      {feedback.errorTypes.length > 0 && (
        <div className="border-t border-stone-100 px-6 py-4">
          <div className="mb-2 text-sm font-medium text-stone-700">Lỗi gặp phải</div>
          <div className="space-y-2">
            {feedback.errorTypes.map((e) => (
              <div key={e} className="flex gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <span>
                  <span className="font-medium text-stone-800">{ERROR_TYPES[e].label}</span>
                  <span className="text-stone-500"> — {ERROR_TYPES[e].description}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.strengths.length > 0 && (
        <div className="border-t border-stone-100 px-6 py-4">
          <div className="mb-2 text-sm font-medium text-stone-700">Điểm tốt</div>
          <ul className="space-y-1.5">
            {feedback.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-stone-600">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div className="border-t border-stone-100 px-6 py-4">
          <div className="mb-2 text-sm font-medium text-stone-700">Cần cải thiện</div>
          <ul className="space-y-1.5">
            {feedback.improvements.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-stone-600">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-500" /> {s}
              </li>
            ))}
          </ul>
          {feedback.missingKeywords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-500">Ý còn thiếu:</span>
              {feedback.missingKeywords.map((k) => (
                <Badge key={k} className="bg-brand-50 text-brand-700 ring-brand-100">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {USE_MOCK && (
        <p className="border-t border-stone-100 bg-stone-50 px-6 py-3 text-xs text-stone-500">
          Chế độ demo: điểm được mô phỏng bằng so khớp từ ngữ. Khi kết nối backend, bài làm được chấm bởi LLM-as-a-Judge với
          prompt aspect-based của VIVID.
        </p>
      )}
    </Card>
  )
}

function RubricGuide() {
  return (
    <Card>
      <CardHeader title="Tiêu chí chấm điểm" description="Dựa trên phương pháp đánh giá aspect-based của VIVID" />
      <ol className="space-y-3 p-5 pt-4">
        {CRITERIA.map(({ key, label, hint }, i) => (
          <li key={key} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-medium text-stone-800">{label}</div>
              <div className="text-sm text-stone-500">{hint}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mx-5 mb-5 rounded-xl bg-paper p-4 text-sm text-stone-600">
        Mỗi tiêu chí được chấm từ 0 đến 5 rồi tổng hợp thành điểm chung. Nếu <b>ý nghĩa cốt lõi</b> sai hoàn toàn (0 điểm) thì
        điểm tổng là 0, dù câu văn trôi chảy đến đâu.
      </div>
    </Card>
  )
}
