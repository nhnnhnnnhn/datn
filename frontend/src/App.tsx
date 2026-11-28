import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/Feedback'
import { createLogger } from '@/lib/logger'
import ForgotPassword from '@/pages/ForgotPassword'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Idioms from '@/pages/Idioms'
import IdiomDetail from '@/pages/IdiomDetail'
import Practice from '@/pages/Practice'
import Sets from '@/pages/Sets'
import SetDetail from '@/pages/SetDetail'
import FlashcardStudy from '@/pages/FlashcardStudy'
import SetLearn from '@/pages/SetLearn'
import SetMatch from '@/pages/SetMatch'
import SetWrite from '@/pages/SetWrite'
import Quiz from '@/pages/Quiz'
import NotFound from '@/pages/NotFound'
import Profile from '@/pages/Profile'
import AdminHome from '@/pages/admin/AdminHome'
import { appRole, homePath } from '@/lib/role'

const log = createLogger('ROUTER')

function useRouteLogging() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    log.debug('navigate', { path: pathname + search })
  }, [pathname, search])
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="min-h-dvh" />
  if (!user) {
    log.debug('redirect to login', { from: location.pathname })
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  const current = appRole(user?.role)
  if (current !== role) {
    log.debug('role mismatch, redirecting', { need: role, have: current })
    return <Navigate to={homePath(current)} replace />
  }
  return <Outlet />
}

export default function App() {
  useRouteLogging()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route element={<AppLayout />}>
          <Route path="idioms" element={<Idioms />} />
          <Route path="idioms/:id" element={<IdiomDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route element={<RequireRole role="student" />}>
            <Route index element={<Dashboard />} />
            <Route path="practice" element={<Practice />} />
            <Route path="sets" element={<Sets />} />
            <Route path="sets/:deckId" element={<SetDetail />} />
            <Route path="quiz" element={<Quiz />} />
          </Route>
          <Route path="admin" element={<RequireRole role="admin" />}>
            <Route index element={<AdminHome />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<RequireRole role="student" />}>
          <Route path="sets/:deckId/flashcards" element={<FlashcardStudy />} />
          <Route path="sets/:deckId/learn" element={<SetLearn />} />
          <Route path="sets/:deckId/match" element={<SetMatch />} />
          <Route path="sets/:deckId/write" element={<SetWrite />} />
        </Route>
      </Route>
    </Routes>
  )
}
