import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { createLogger } from '@/lib/logger'

const log = createLogger('CLASS')

export function JoinClassForm() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const join = useMutation({
    mutationFn: () => api.classes.join(code),
    meta: { tag: 'CLASS' },
    onSuccess: (cls) => {
      log.info('joined class', { classId: cls.id })
      setCode('')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) join.mutate()
      }}
    >
      <label htmlFor="class-code" className="text-sm font-medium text-stone-700">
        Tham gia lớp bằng mã
      </label>
      <div className="mt-1.5 flex gap-2">
        <Input id="class-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: VND10A" className="uppercase" />
        <Button type="submit" variant="outline" loading={join.isPending}>
          Tham gia
        </Button>
      </div>
      {join.error && (
        <div className="mt-2">
          <ErrorMessage error={join.error} />
        </div>
      )}
      {join.isSuccess && <p className="mt-2 text-sm text-emerald-700">Đã tham gia {join.data.name}.</p>}
    </form>
  )
}
