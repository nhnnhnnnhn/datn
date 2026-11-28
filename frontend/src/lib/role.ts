import type { Role } from '@/types'

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Học sinh',
  admin: 'Quản trị viên',
}

export function homePath(role: Role | undefined): string {
  if (role === 'admin') return '/admin'
  return '/'
}
