import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, Role, User } from '@/types'
import { api } from '@/api'
import { getToken, setToken } from '@/api/client'
import { createLogger } from '@/lib/logger'
import { logFailure } from '@/lib/logFailure'

const log = createLogger('AUTH')

interface AuthState {
  user: User | null
  loading: boolean
  login(email: string, password: string): Promise<void>
  register(name: string, email: string, password: string, role: Role): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!getToken())

  useEffect(() => {
    if (!getToken()) return
    api.auth
      .me()
      .then((u) => {
        log.debug('session restored', { userId: u.id })
        setUser(u)
      })
      .catch((err) => {
        logFailure(log, 'session restore failed', err)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback(
    (res: AuthResponse) => {
      setToken(res.token)
      queryClient.clear()
      setUser(res.user)
    },
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        try {
          const res = await api.auth.login(email, password)
          accept(res)
          log.info('logged in', { userId: res.user.id })
        } catch (err) {
          logFailure(log, 'login failed', err)
          throw err
        }
      },
      register: async (name, email, password, role) => {
        try {
          const res = await api.auth.register(name, email, password, role)
          accept(res)
          log.info('registered', { userId: res.user.id, role })
        } catch (err) {
          logFailure(log, 'register failed', err)
          throw err
        }
      },
      logout: async () => {
        await api.auth.logout()
        log.info('logged out', { userId: user?.id })
        setToken(null)
        queryClient.clear()
        setUser(null)
      },
    }),
    [user, loading, accept, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
