import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import type { AdminUser, Role } from '@/types'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ErrorMessage } from '@/components/ui/Feedback'
import { FieldError, Input, Label, Select } from '@/components/ui/Field'
import { createLogger } from '@/lib/logger'
import { ROLE_LABEL } from '@/lib/role'

const log = createLogger('ADMIN')
const ROLES: Role[] = ['student', 'admin']
const MIN_PASSWORD = 6

interface Errors {
  name?: string
  email?: string
  password?: string
}

function validate({ name, email, password }: { name: string; email: string; password: string }, creating: boolean): Errors {
  const errors: Errors = {}
  if (!name.trim()) errors.name = 'Vui lòng nhập họ tên'
  if (creating) {
    if (!/^\S+@\S+$/.test(email.trim())) errors.email = 'Email không hợp lệ'
    if (password.length < MIN_PASSWORD) errors.password = `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự`
  }
  return errors
}

function UserFormBody({ user, onClose }: { user?: AdminUser; onClose: () => void }) {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const creating = !user
  const isSelf = user?.id === me?.id
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(user?.role ?? 'student')
  const [errors, setErrors] = useState<Errors>({})

  const save = useMutation({
    mutationFn: () =>
      user
        ? api.admin.updateUser(user.id, { name: name.trim(), ...(role !== user.role && { role }) })
        : api.admin.createUser({ name: name.trim(), email: email.trim(), password, role }),
    meta: { tag: 'ADMIN' },
    onSuccess: (saved) => {
      log.info(creating ? 'user created' : 'user updated', { userId: saved.id, role: saved.role })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validate({ name, email, password }, creating)
    setErrors(found)
    if (Object.keys(found).length === 0) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="user-name">Họ và tên</Label>
        <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="user-name-error" />
        <FieldError id="user-name-error">{errors.name}</FieldError>
      </div>
      {creating ? (
        <>
          <div>
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              aria-invalid={!!errors.email}
              aria-describedby="user-email-error"
            />
            <FieldError id="user-email-error">{errors.email}</FieldError>
          </div>
          <div>
            <Label htmlFor="user-password">Mật khẩu</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="user-password-error"
            />
            <FieldError id="user-password-error">{errors.password}</FieldError>
          </div>
        </>
      ) : (
        <p className="text-sm text-stone-500">{user.email}</p>
      )}
      <div>
        <Label htmlFor="user-role">Vai trò</Label>
        <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        {isSelf && <p className="mt-1 text-xs text-stone-500">Bạn không thể đổi vai trò của chính mình.</p>}
      </div>
      {save.error != null && <ErrorMessage error={save.error} />}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Hủy
        </Button>
        <Button type="submit" variant="dark" loading={save.isPending}>
          {creating ? 'Tạo tài khoản' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  )
}

export function UserForm({ open, user, onClose }: { open: boolean; user?: AdminUser; onClose: () => void }) {
  return (
    <Dialog open={open} title={user ? 'Sửa người dùng' : 'Thêm người dùng'} onClose={onClose}>
      <UserFormBody user={user} onClose={onClose} />
    </Dialog>
  )
}
