import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { BookOpen, ChartLine, PenLine, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { ErrorMessage } from '@/components/ui/Feedback'
import { USE_MOCK } from '@/lib/constants'
import { cn } from '@/lib/cn'

const FEATURES = [
  { icon: BookOpen, title: 'Kho tra cứu', text: 'Thành ngữ, tục ngữ kèm giải nghĩa, chủ đề và đặc trưng ngôn ngữ' },
  { icon: PenLine, title: 'AI chấm giải nghĩa', text: 'Chấm theo 4 tiêu chí và phản hồi chi tiết cho từng bài làm' },
  { icon: Sparkles, title: 'Quiz & Flashcard tự động', text: 'Sinh câu hỏi, bộ thẻ ôn tập theo chủ đề hoặc điểm yếu' },
  { icon: ChartLine, title: 'Thống kê tiến độ', text: 'Theo dõi điểm số, chuỗi ngày học và mức độ thành thạo' },
]

export default function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full border-[40px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-[28rem] rounded-full border-[56px] border-gold-300/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gold-100 font-serif text-xl font-bold text-brand-700">V</div>
          <span className="font-serif text-xl font-bold">VIVID Learn</span>
        </div>
        <div className="relative">
          <p className="font-serif text-4xl leading-tight font-semibold">
            “Đi một ngày đàng,
            <br />
            học một sàng khôn.”
          </p>
          <p className="mt-4 max-w-md text-brand-100">
            Nền tảng học thành ngữ, tục ngữ tiếng Việt xây dựng trên bộ dữ liệu VIVID — 1.636 câu được chuyên gia ngôn
            ngữ gán nhãn chủ đề và đặc trưng.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <Icon className="size-5 text-gold-300" />
                <div className="mt-2 font-medium">{title}</div>
                <div className="mt-1 text-sm text-brand-100/80">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-brand-200">Đồ án tốt nghiệp</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600 font-serif text-xl font-bold text-gold-100">V</div>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900">
            {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-2 text-stone-500">
            {mode === 'login' ? 'Đăng nhập để tiếp tục hành trình học.' : 'Bắt đầu học thành ngữ, tục ngữ ngay hôm nay.'}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-medium">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={cn('rounded-lg py-2 transition', mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500')}
              >
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name">Họ và tên</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            {error != null && <ErrorMessage error={error} />}
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>

          {USE_MOCK && (
            <p className="mt-6 rounded-xl bg-gold-50 px-4 py-3 text-xs leading-relaxed text-gold-700">
              Chế độ demo: nhập email bất kỳ và mật khẩu từ 6 ký tự để vào thử. Dữ liệu chỉ lưu trong trình duyệt này.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
