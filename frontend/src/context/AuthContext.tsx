import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, ProfileUpdate, SignUpRole, User } from '@/types'
import { api } from '@/api'
import { getToken, setToken, setUnauthorizedHandler } from '@/api/client'
import { createLogger } from '@/lib/logger'
import { logFailure } from '@/lib/logFailure'

const log = createLogger('AUTH')

interface AuthState {
  user: User | null
  loading: boolean
  login(email: string, password: string): Promise<void>
  register(name: string, email: string, password: string, role: SignUpRole): Promise<void>
  updateProfile(input: ProfileUpdate): Promise<void>
  resetPassword(token: string, password: string): Promise<void>
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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      log.info('session expired, signed out')
      queryClient.clear()
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

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
      updateProfile: async (input) => {
        try {
          const updated = await api.auth.updateProfile(input)
          setUser(updated)
          log.info('profile updated', { userId: updated.id })
        } catch (err) {
          logFailure(log, 'profile update failed', err)
          throw err
        }
      },
      resetPassword: async (token, password) => {
        try {
          const res = await api.auth.resetPassword(token, password)
          accept(res)
          log.info('password reset', { userId: res.user.id })
        } catch (err) {
          logFailure(log, 'password reset failed', err)
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
