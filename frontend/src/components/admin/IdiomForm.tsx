import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type { Idiom, IdiomInput, TopicId, TraitId } from '@/types'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ErrorMessage } from '@/components/ui/Feedback'
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/Field'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('ADMIN')

interface Errors {
  phrase?: string
  explanation?: string
}

function toInput(
  idiom: Idiom | undefined,
  values: { phrase: string; explanation: string; topic: TopicId; traits: TraitId[] },
): IdiomInput {
  return {
    phrase: values.phrase.trim(),
    explanation: values.explanation.trim(),
    topic: values.topic,
    traits: values.traits,
    // The form does not edit these, so saving keeps what the idiom already has
    ...(idiom?.note ? { note: idiom.note } : {}),
    ...(idiom?.citation ? { citation: idiom.citation } : {}),
    ...(idiom?.glossary ? { glossary: idiom.glossary } : {}),
  }
}

function validate(input: IdiomInput): Errors {
  const errors: Errors = {}
  if (!input.phrase) errors.phrase = 'Vui lòng nhập thành ngữ, tục ngữ'
  if (!input.explanation) errors.explanation = 'Vui lòng nhập phần giải thích'
  return errors
}

function IdiomFormBody({ idiom, onClose }: { idiom?: Idiom; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [phrase, setPhrase] = useState(idiom?.phrase ?? '')
  const [explanation, setExplanation] = useState(idiom?.explanation ?? '')
  const [topic, setTopic] = useState<TopicId>(idiom?.topic ?? 'other')
  const [traits, setTraits] = useState<TraitId[]>(idiom?.traits ?? [])
  const [errors, setErrors] = useState<Errors>({})

  const save = useMutation({
    mutationFn: (input: IdiomInput) => (idiom ? api.admin.updateIdiom(idiom.id, input) : api.admin.createIdiom(input)),
    meta: { tag: 'ADMIN' },
    onSuccess: (saved) => {
      log.info(idiom ? 'idiom updated' : 'idiom created', { idiomId: saved.id })
      queryClient.invalidateQueries({ queryKey: ['idioms'] })
      queryClient.invalidateQueries({ queryKey: ['idiom'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const input = toInput(idiom, { phrase, explanation, topic, traits })
    const found = validate(input)
    setErrors(found)
    if (Object.keys(found).length === 0) save.mutate(input)
  }

  const toggleTrait = (trait: TraitId) =>
    setTraits((prev) => (prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]))

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="idiom-phrase">Thành ngữ, tục ngữ</Label>
        <Input id="idiom-phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} aria-invalid={!!errors.phrase} aria-describedby="idiom-phrase-error" />
        <FieldError id="idiom-phrase-error">{errors.phrase}</FieldError>
      </div>
      <div>
        <Label htmlFor="idiom-explanation">Giải thích</Label>
        <Textarea
          id="idiom-explanation"
          rows={4}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          aria-invalid={!!errors.explanation}
          aria-describedby="idiom-explanation-error"
        />
        <FieldError id="idiom-explanation-error">{errors.explanation}</FieldError>
      </div>
      <div>
        <Label htmlFor="idiom-topic">Chủ đề</Label>
        <Select id="idiom-topic" value={topic} onChange={(e) => setTopic(e.target.value as TopicId)}>
          {TOPIC_IDS.map((id) => (
            <option key={id} value={id}>
              {TOPICS[id].label}
            </option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Đặc trưng</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TRAIT_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={traits.includes(id)} onChange={() => toggleTrait(id)} className="accent-stone-900" />
              {TRAITS[id].label}
            </label>
          ))}
        </div>
      </fieldset>
      {save.error != null && <ErrorMessage error={save.error} />}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Hủy
        </Button>
        <Button type="submit" variant="dark" loading={save.isPending}>
          {idiom ? 'Lưu thay đổi' : 'Thêm câu'}
        </Button>
      </div>
    </form>
  )
}

export function IdiomForm({ open, idiom, onClose }: { open: boolean; idiom?: Idiom; onClose: () => void }) {
  return (
    <Dialog open={open} title={idiom ? 'Sửa thành ngữ, tục ngữ' : 'Thêm thành ngữ, tục ngữ'} onClose={onClose}>
      <IdiomFormBody idiom={idiom} onClose={onClose} />
    </Dialog>
  )
}
