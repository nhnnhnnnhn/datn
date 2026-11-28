import type { Role } from '@/types'

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Học sinh',
  admin: 'Quản trị viên',
}

export function homePath(role: Role | undefined): string {
  if (role === 'admin') return '/admin'
  return '/'
}

// The backend still stores a teacher role; the app only knows students and admins
export function appRole(role: string | undefined): Role | undefined {
  if (!role) return undefined
  return role === 'admin' ? 'admin' : 'student'
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[appRole(role) ?? 'student']
}
