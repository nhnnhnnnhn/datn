import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignmentInput, TopicId, TraitId } from '@/types'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { firstSentence } from '@/lib/text'

const log = createLogger('ASSIGNMENT')

function defaultDue(): string {
  const d = new Date(Date.now() + 7 * 86_400_000)
  d.setHours(23, 59, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AssignmentNew() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [classId, setClassId] = useState(params.get('classId') ?? '')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('Giải nghĩa từng câu bằng lời của em.')
  const [dueAt, setDueAt] = useState(defaultDue)
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [trait, setTrait] = useState<TraitId | ''>((params.get('trait') as TraitId | null) ?? '')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<number[]>([])

  const classes = useQuery({ queryKey: ['classes'], queryFn: api.classes.list, meta: { tag: 'CLASS' } })
  const idioms = useQuery({
    queryKey: ['idioms', { q, topic, trait, pageSize: 200 }],
    queryFn: () => api.idioms.list({ q, topic: topic || undefined, trait: trait || undefined, pageSize: 200 }),
    meta: { tag: 'IDIOM' },
  })

  const create = useMutation({
    mutationFn: (input: AssignmentInput) => api.assignments.create(input),
    meta: { tag: 'ASSIGNMENT' },
    onSuccess: (a) => {
      log.info('created assignment', { assignmentId: a.id, classId: a.classId, idioms: a.idiomIds.length })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      navigate(`/teacher/assignments/${a.id}`)
    },
  })

  const effectiveClass = classId || classes.data?.[0]?.id || ''
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <form
      className="mx-auto max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault()
        create.mutate({ classId: effectiveClass, title, instructions, idiomIds: picked, dueAt: new Date(dueAt).toISOString() })
      }}
    >
      <Link to={effectiveClass ? `/teacher/classes/${effectiveClass}` : '/teacher'} className="text-sm text-stone-500 hover:text-stone-800">
        ← Lớp học
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">Giao bài giải nghĩa</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="asg-class">Lớp</Label>
          <Select id="asg-class" value={effectiveClass} onChange={(e) => setClassId(e.target.value)}>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="asg-due">Hạn nộp</Label>
          <Input id="asg-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="asg-title">Tên bài</Label>
          <Input id="asg-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Giải nghĩa 5 câu về lòng biết ơn" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="asg-instructions">Hướng dẫn</Label>
          <Textarea id="asg-instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-stone-900">
          Chọn câu <span className="font-normal text-stone-500">— đã chọn {picked.length}</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm câu" aria-label="Tìm câu" className="w-56" />
          <Select value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')} className="w-auto" aria-label="Chủ đề">
            <option value="">Mọi chủ đề</option>
            {TOPIC_IDS.map((t) => (
              <option key={t} value={t}>
                {TOPICS[t].label}
              </option>
            ))}
          </Select>
          <Select value={trait} onChange={(e) => setTrait(e.target.value as TraitId | '')} className="w-auto" aria-label="Đặc trưng">
            <option value="">Mọi đặc trưng</option>
            {TRAIT_IDS.map((t) => (
              <option key={t} value={t}>
                {TRAITS[t].label}
              </option>
            ))}
          </Select>
        </div>
        {!idioms.data ? (
          <Spinner />
        ) : (
          <ul className="mt-3 max-h-96 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">
            {idioms.data.items.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-stone-50">
                  <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="mt-1 accent-stone-900" />
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-900">{i.phrase}</span>
                    <span className="block truncate text-sm text-stone-500">{firstSentence(i.explanation)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {create.error && (
        <div className="mt-4">
          <ErrorMessage error={create.error} />
        </div>
      )}
      <div className="mt-6 flex gap-2">
        <Button type="submit" variant="dark" size="lg" loading={create.isPending} disabled={!effectiveClass}>
          Giao bài
        </Button>
      </div>
    </form>
  )
}
