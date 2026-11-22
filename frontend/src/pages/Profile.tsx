import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { PageHeader, Panel } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'

const MIN_PASSWORD_LENGTH = 6
const ROLE_LABEL = { student: 'Học sinh', teacher: 'Giáo viên', admin: 'Quản trị viên' }

function SavedNotice({ children }: { children: string }) {
  return (
    <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {children}
    </p>
  )
}

function InfoForm() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [dailyGoal, setDailyGoal] = useState(String(user?.dailyGoal ?? 10))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError(null)
    setSubmitting(true)
    try {
      await updateProfile({ name, ...(user?.role === 'student' && { dailyGoal: Number(dailyGoal) }) })
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold text-stone-900">Thông tin cá nhân</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} readOnly disabled />
          <p className="mt-1 text-xs text-stone-500">{ROLE_LABEL[user.role]} · email không đổi được.</p>
        </div>
        {user.role === 'student' && (
          <div>
            <Label htmlFor="dailyGoal">Mục tiêu mỗi ngày (số thẻ)</Label>
            <Input id="dailyGoal" type="number" min={1} max={100} value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} required />
          </div>
        )}
        {saved && <SavedNotice>Đã lưu thay đổi.</SavedNotice>}
        {error != null && <ErrorMessage error={error} />}
        <Button type="submit" variant="dark" loading={submitting}>
          Lưu thay đổi
        </Button>
      </form>
    </Panel>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(new Error(`Mật khẩu mới cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`))
      return
    }
    if (next !== confirm) {
      setError(new Error('Hai mật khẩu mới chưa khớp'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await api.auth.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold text-stone-900">Đổi mật khẩu</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
          <Input id="current-password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="new-password">Mật khẩu mới</Label>
          <Input id="new-password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          <p className="mt-1 text-xs text-stone-500">Tối thiểu {MIN_PASSWORD_LENGTH} ký tự.</p>
        </div>
        <div>
          <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
          <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </div>
        {saved && <SavedNotice>Đã đổi mật khẩu.</SavedNotice>}
        {error != null && <ErrorMessage error={error} />}
        <Button type="submit" variant="dark" loading={submitting}>
          Đổi mật khẩu
        </Button>
      </form>
    </Panel>
  )
}

export default function Profile() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Hồ sơ" />
      <div className="space-y-6">
        <InfoForm />
        <PasswordForm />
      </div>
    </div>
  )
}
