import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Flame, House, Layers, PenLine, Users } from 'lucide-react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { HeaderSearch } from './HeaderSearch'
import { cn } from '@/lib/cn'

const STUDENT_NAV = [
  { to: '/', label: 'Trang chủ', icon: House, end: true },
  { to: '/idioms', label: 'Tra cứu', icon: BookOpen },
  { to: '/practice', label: 'Luyện viết', icon: PenLine },
  { to: '/sets', label: 'Bộ thẻ', icon: Layers },
]

const TEACHER_NAV = [
  { to: '/teacher', label: 'Lớp học', icon: Users, end: false },
  { to: '/idioms', label: 'Tra cứu', icon: BookOpen },
]

function StreakCounter() {
  const { data } = useQuery({ queryKey: ['progress'], queryFn: api.progress.summary, meta: { tag: 'PROGRESS' } })
  if (!data) return null
  return (
    <Link
      to="/"
      title={`${data.streak} ngày học liên tiếp`}
      className={cn('flex items-center gap-1 text-sm font-semibold tabular-nums', data.todayCount ? 'text-orange-600' : 'text-stone-400')}
    >
      <Flame className="size-4" fill={data.todayCount ? 'currentColor' : 'none'} />
      {data.streak}
    </Link>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) return null
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Tài khoản"
        className="flex size-8 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-300"
      >
        {user.name.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg">
          <div className="border-b border-stone-100 px-3 py-2">
            <div className="truncate font-medium text-stone-900">{user.name}</div>
            <div className="truncate text-xs text-stone-500">
              {user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'} · {user.email}
            </div>
          </div>
          <Link to="/profile" className="block px-3 py-2 text-stone-700 hover:bg-stone-50">
            Hồ sơ
          </Link>
          <button onClick={logout} className="w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-50">
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const nav: { to: string; label: string; icon: typeof House; end?: boolean }[] = user?.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to={user?.role === 'teacher' ? '/teacher' : '/'} className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-brand-700">VIVID</span>
            <span className="hidden text-sm text-stone-500 sm:inline">Thành ngữ Việt</span>
          </Link>
          <nav className="hidden h-full items-stretch gap-5 md:flex">
            {nav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center border-b-2 text-sm transition-colors',
                    isActive ? 'border-brand-600 font-medium text-stone-900' : 'border-transparent text-stone-600 hover:text-stone-900',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <HeaderSearch />
            {user?.role === 'student' && <StreakCounter />}
            <UserMenu />
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 md:pt-8 md:pb-12">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[10px]', isActive ? 'font-semibold text-brand-700' : 'text-stone-500')
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
