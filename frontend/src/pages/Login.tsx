import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { USE_MOCK } from '@/lib/constants'
import { homePath } from '@/lib/role'
import { VIVID } from '@/lib/vivid'

const DEMO_STUDENT = { name: 'Học sinh Demo', email: 'demo.hocsinh@vivid.test' }
const DEMO_ADMIN_EMAIL = 'demo.quantri@vivid.test'
const DEMO_PASSWORD = 'demo-password'

export default function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  if (user) return <Navigate to={from ?? homePath(user.role)} replace />

  async function run(action: () => Promise<void>) {
    setError(null)
    setSubmitting(true)
    try {
      await action()
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(() => (mode === 'login' ? login(email, password) : register(name, email, password, 'student')))
  }

  function tryDemo() {
    run(async () => {
      try {
        await login(DEMO_STUDENT.email, DEMO_PASSWORD)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) throw err
        await register(DEMO_STUDENT.name, DEMO_STUDENT.email, DEMO_PASSWORD, 'student')
      }
    })
  }

  function tryAdminDemo() {
    run(() => login(DEMO_ADMIN_EMAIL, DEMO_PASSWORD))
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
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-1 text-[15px] text-stone-500">
            Tra cứu, luyện giải nghĩa và ôn tập thành ngữ, tục ngữ tiếng Việt trên bộ dữ liệu{' '}
            <a href={VIVID.arxivUrl} target="_blank" rel="noreferrer" className="text-stone-700 underline decoration-stone-300 underline-offset-2">
              VIVID ({VIVID.venue})
            </a>
            : {VIVID.releasedPairs.toLocaleString('vi-VN')} câu do chuyên gia ngôn ngữ gán nhãn.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name">Họ và tên</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'register' && <p className="mt-1 text-xs text-stone-500">Tối thiểu 6 ký tự.</p>}
              {mode === 'login' && (
                <Link to="/forgot-password" className="mt-1.5 inline-block text-sm text-stone-600 hover:underline">
                  Quên mật khẩu?
                </Link>
              )}
            </div>
            {error != null && <ErrorMessage error={error} />}
            <Button type="submit" variant="dark" size="lg" className="w-full" loading={submitting}>
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-stone-600">
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
              className="font-medium text-brand-700 hover:underline"
            >
              {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </p>

          {USE_MOCK && (
            <div className="mt-8 border-t border-stone-200 pt-5">
              <p className="text-sm text-stone-600">Bản demo chưa có máy chủ. Vào thử bằng tài khoản mẫu:</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={tryDemo} disabled={submitting}>
                  Học sinh
                </Button>
                <Button variant="outline" onClick={tryAdminDemo} disabled={submitting}>
                  Quản trị
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
