import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/Feedback'
import { createLogger } from '@/lib/logger'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Idioms from '@/pages/Idioms'
import IdiomDetail from '@/pages/IdiomDetail'
import Practice from '@/pages/Practice'
import Quiz from '@/pages/Quiz'
import Flashcards from '@/pages/Flashcards'
import FlashcardStudy from '@/pages/FlashcardStudy'
import NotFound from '@/pages/NotFound'

// recharts is heavy, so the stats page is code-split
const Progress = lazy(() => import('@/pages/Progress'))

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

export default function App() {
  useRouteLogging()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="idioms" element={<Idioms />} />
        <Route path="idioms/:id" element={<IdiomDetail />} />
        <Route path="practice" element={<Practice />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="flashcards/:deckId" element={<FlashcardStudy />} />
        <Route
          path="progress"
          element={
            <Suspense fallback={<Spinner />}>
              <Progress />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
