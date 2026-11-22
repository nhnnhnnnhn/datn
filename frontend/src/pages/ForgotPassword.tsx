import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'

const MIN_PASSWORD_LENGTH = 6

export default function ForgotPassword() {
  const { user, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<'request' | 'reset'>(params.get('token') ? 'reset' : 'request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function run(action: () => Promise<void>) {
    setError(null)
    setSubmitting(true)
    try {
      await action()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  function onRequest(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      const res = await api.auth.forgotPassword(email)
      if (res.resetToken) {
        setToken(res.resetToken)
        setNotice('Máy chủ chưa gửi được email nên mã đặt lại đã được điền sẵn bên dưới.')
      } else {
        setNotice(res.message)
      }
      setStep('reset')
    })
  }

  function onReset(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(new Error(`Mật khẩu cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`))
      return
    }
    if (password !== confirm) {
      setError(new Error('Hai mật khẩu chưa khớp'))
      return
    }
    run(async () => {
      await resetPassword(token.trim(), password)
      navigate('/', { replace: true })
    })
  }

  function switchStep(next: 'request' | 'reset') {
    setStep(next)
    setNotice(null)
    setError(null)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-brand-700">VIVID</span>
        <span className="ml-2 text-sm text-stone-500">Thành ngữ Việt</span>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {step === 'request' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
          </h1>
          <p className="mt-1 text-[15px] text-stone-500">
            {step === 'request'
              ? 'Nhập email đã đăng ký, bạn sẽ nhận mã để đặt mật khẩu mới.'
              : 'Nhập mã đặt lại và mật khẩu mới. Bạn sẽ được đăng nhập ngay sau khi đổi.'}
          </p>

          {step === 'request' ? (
            <form onSubmit={onRequest} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              {error != null && <ErrorMessage error={error} />}
              <Button type="submit" variant="dark" size="lg" className="w-full" loading={submitting}>
                Gửi mã đặt lại
              </Button>
              <button type="button" onClick={() => switchStep('reset')} className="block w-full text-center text-sm text-stone-600 hover:underline">
                Tôi đã có mã
              </button>
            </form>
          ) : (
            <form onSubmit={onReset} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
              {notice && <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">{notice}</p>}
              <div>
                <Label htmlFor="token">Mã đặt lại</Label>
                <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="one-time-code" required />
              </div>
              <div>
                <Label htmlFor="password">Mật khẩu mới</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                <p className="mt-1 text-xs text-stone-500">Tối thiểu {MIN_PASSWORD_LENGTH} ký tự.</p>
              </div>
              <div>
                <Label htmlFor="confirm">Nhập lại mật khẩu mới</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
              {error != null && <ErrorMessage error={error} />}
              <Button type="submit" variant="dark" size="lg" className="w-full" loading={submitting}>
                Đặt lại mật khẩu
              </Button>
              <button type="button" onClick={() => switchStep('request')} className="block w-full text-center text-sm text-stone-600 hover:underline">
                Gửi lại mã
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-stone-600">
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
