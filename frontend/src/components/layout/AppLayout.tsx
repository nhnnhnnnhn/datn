import { NavLink, Outlet } from 'react-router'
import { ChartLine, House, Layers, Library, ListChecks, LogOut, PenLine } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { USE_MOCK } from '@/lib/constants'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/', label: 'Trang chủ', short: 'Chính', icon: House, end: true },
  { to: '/idioms', label: 'Kho tra cứu', short: 'Tra cứu', icon: Library },
  { to: '/practice', label: 'Luyện giải nghĩa', short: 'Luyện', icon: PenLine },
  { to: '/quiz', label: 'Quiz', short: 'Quiz', icon: ListChecks },
  { to: '/flashcards', label: 'Flashcard', short: 'Thẻ', icon: Layers },
  { to: '/progress', label: 'Tiến độ', short: 'Tiến độ', icon: ChartLine },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 font-serif text-lg font-bold text-gold-100 shadow-sm">
        V
      </div>
      <div className="leading-tight">
        <div className="font-serif text-lg font-bold text-stone-900">VIVID Learn</div>
        <div className="text-[11px] text-stone-500">Thành ngữ · Tục ngữ Việt</div>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const initials = (user?.name ?? '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200/80 bg-white/70 backdrop-blur lg:flex">
        <div className="px-5 pt-6 pb-8">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                )
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        {USE_MOCK && (
          <div className="mx-4 mb-3 rounded-xl border border-dashed border-gold-300 bg-gold-50 px-3 py-2 text-xs text-gold-700">
            Chế độ demo · dữ liệu mô phỏng, chưa kết nối backend
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-stone-200/80 p-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-gold-100 font-semibold text-gold-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-stone-900">{user?.name}</div>
            <div className="truncate text-xs text-stone-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/80 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <span className="flex size-9 items-center justify-center rounded-full bg-gold-100 font-semibold text-gold-700" title={user?.name}>
            {initials}
          </span>
          <button onClick={logout} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Đăng xuất">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                isActive ? 'text-brand-600' : 'text-stone-500',
              )
            }
          >
            <Icon className="size-5" />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
