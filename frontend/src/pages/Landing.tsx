import { Link } from 'react-router'
import { BookOpen, Layers, ListChecks, PenLine, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: BookOpen, label: 'Tra cứu' },
  { icon: PenLine, label: 'Luyện giải nghĩa' },
  { icon: ListChecks, label: 'Trắc nghiệm' },
  { icon: Layers, label: 'Thẻ ghi nhớ' },
]

const SAMPLES = [
  { text: 'Ăn quả nhớ kẻ trồng cây', className: '-rotate-6 -translate-x-6 bg-white' },
  { text: 'Học một biết mười', className: 'rotate-3 translate-x-8 bg-brand-50' },
  { text: 'Có công mài sắt, có ngày nên kim', className: '-rotate-2 bg-white' },
]

const BIG_BUTTON =
  'flex h-12 w-full items-center justify-center rounded-2xl border-2 border-b-4 text-[15px] font-bold uppercase tracking-wide transition-[filter,transform] active:translate-y-px'

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="mx-auto flex w-full max-w-5xl items-center px-6 py-5">
        <span className="text-2xl font-extrabold tracking-tight text-brand-600">VIVID</span>
        <span className="ml-2 text-sm font-medium text-stone-400">Thành ngữ Việt</span>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-6 py-10">
        <div className="grid w-full items-center gap-10 md:grid-cols-2">
          <div aria-hidden className="hidden flex-col items-center gap-4 md:flex">
            {SAMPLES.map(({ text, className }) => (
              <p
                key={text}
                className={cn(
                  'rounded-2xl border-2 border-b-4 border-stone-200 px-5 py-4 text-center text-lg font-semibold text-stone-800',
                  className,
                )}
              >
                {text}
              </p>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-2xl font-bold leading-snug text-stone-700 sm:text-3xl">
              Hiểu thành ngữ, tục ngữ Việt bằng cách tự giải nghĩa!
            </h1>
            <div className="flex w-full max-w-[19rem] flex-col gap-3">
              <Link
                to="/login?mode=register"
                className={cn(BIG_BUTTON, 'border-brand-700 bg-brand-600 text-white hover:brightness-110')}
              >
                Bắt đầu
              </Link>
              <Link
                to="/login"
                className={cn(BIG_BUTTON, 'border-stone-200 bg-white text-brand-700 hover:bg-stone-50')}
              >
                Tôi đã có tài khoản
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t-2 border-stone-200">
        <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-600">
              <Icon className="size-5 text-brand-600" />
              {label}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}
