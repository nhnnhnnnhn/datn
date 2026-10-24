import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { PracticeSession } from '@/components/practice/PracticeSession'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'

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
    <div>
      <PageHeader
        title="Luyện viết"
        description="Tự giải nghĩa, nhận góp ý theo từng tiêu chí, sửa và nộp lại."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')} className="h-8 w-auto" aria-label="Chủ đề">
              <option value="">Mọi chủ đề</option>
              {TOPIC_IDS.map((t) => (
                <option key={t} value={t}>
                  {TOPICS[t].label}
                </option>
              ))}
            </Select>
            <Select value={trait} onChange={(e) => setTrait(e.target.value as TraitId | '')} className="h-8 w-auto" aria-label="Đặc trưng">
              <option value="">Mọi đặc trưng</option>
              {TRAIT_IDS.map((t) => (
                <option key={t} value={t}>
                  {TRAITS[t].label}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => next.mutate()} loading={next.isPending}>
              Đổi câu
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
