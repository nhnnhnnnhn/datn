import { ApiError } from '@/api/client'
import type { AdminStats, AdminUser, AdminUserQuery, Paginated, Role, User } from '@/types'
import { normalize, toDateKey } from '@/lib/text'
import { IDIOMS } from './idioms.data'
import { DAY, currentUser, dbKey, type Db } from './db'
import { read, remove, seededRandom, write } from './store'

export const DEMO_ADMIN_EMAIL = 'demo.quantri@vivid.test'
const SIGNUP_DAYS = 14

interface Activity {
  gradings: number
  quizzes: number
  flashcardReviews: number
}

interface Row extends AdminUser {
  activity?: Activity
}

const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô']
const GIVEN = ['Minh Anh', 'Hải Long', 'Thu Hà', 'Quốc Bảo', 'Ngọc Lan', 'Đức Huy', 'Phương Thảo', 'Gia Hân', 'Khánh Linh', 'Tuấn Kiệt']

function seededUsers(): Row[] {
  const rng = seededRandom('admin-users')
  const now = Date.now()
  return Array.from({ length: 24 }, (_, i) => {
    const name = `${FAMILY[Math.floor(rng() * FAMILY.length)]} ${GIVEN[Math.floor(rng() * GIVEN.length)]}`
    const createdAt = new Date(now - Math.floor(rng() * 30) * DAY - Math.floor(rng() * DAY)).toISOString()
    const recentlyActive = rng() < 0.75
    return {
      id: `seed-${i}`,
      name,
      email: `${normalize(name).replace(/\s+/g, '.')}.${i}@vivid.test`,
      role: 'student',
      active: true,
      createdAt,
      lastActiveAt: recentlyActive ? new Date(now - Math.floor(rng() * 5) * DAY).toISOString() : null,
      activity: {
        gradings: recentlyActive ? Math.floor(rng() * 30) : 0,
        quizzes: recentlyActive ? Math.floor(rng() * 12) : 0,
        flashcardReviews: recentlyActive ? Math.floor(rng() * 200) : 0,
      },
    }
  })
}

const SEEDED = seededUsers()
const inactiveIds = () => new Set(read<string[]>('admin:inactive', []))

export function isActive(userId: string): boolean {
  return !inactiveIds().has(userId)
}

export function ensureDemoAdmin() {
  const users = read<Record<string, User>>('users', {})
  if (users[DEMO_ADMIN_EMAIL]) return
  const admin: User = {
    id: 'demo-admin',
    name: 'Quản trị viên Demo',
    email: DEMO_ADMIN_EMAIL,
    role: 'admin',
    dailyGoal: 10,
    createdAt: new Date(Date.now() - 60 * DAY).toISOString(),
  }
  write('users', { ...users, [DEMO_ADMIN_EMAIL]: admin })
}

const MIGRATED_FLAG = 'admin:migrated:v1'

// The teacher role no longer exists: demo accounts created with it become students
export function migrateLegacy() {
  if (read<boolean>(MIGRATED_FLAG, false)) return
  const asStudent = <T extends User>(user: T): T => ((user.role as string) === 'teacher' ? { ...user, role: 'student' } : user)
  const users = read<Record<string, User>>('users', {})
  write('users', Object.fromEntries(Object.entries(users).map(([email, user]) => [email, asStudent(user)])))
  const session = read<User | null>('session', null)
  if (session) write('session', asStudent(session))
  remove('classroom:v2')
  write(MIGRATED_FLAG, true)
}

export function requireAdmin() {
  if (currentUser().role !== 'admin') throw new ApiError(403, 'Bạn không có quyền truy cập')
}

function allUsers(): Row[] {
  const inactive = inactiveIds()
  const session = currentUser()
  const real = Object.values(read<Record<string, User>>('users', {})).map((u): Row => {
    const db = read<Db | null>(dbKey(u.id), null)
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? 'student',
      active: !inactive.has(u.id),
      createdAt: u.createdAt,
      lastActiveAt: u.id === session.id ? new Date().toISOString() : null,
      activity: db ? { gradings: db.attempts.length, quizzes: db.quizResults.length, flashcardReviews: db.reviews.length } : undefined,
    }
  })
  const seeded = SEEDED.map((u) => ({ ...u, active: !inactive.has(u.id) }))
  return [...real, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function toAdminUser(row: Row): AdminUser {
  const { activity: _activity, ...user } = row
  return user
}

export const adminMock = {
  stats(): AdminStats {
    requireAdmin()
    const users = allUsers()
    const now = Date.now()
    const count = (role: Role) => users.filter((u) => u.role === role).length
    const sum = (key: keyof Activity) => users.reduce((total, u) => total + (u.activity?.[key] ?? 0), 0)
    const signups = new Map<string, number>()
    for (const u of users) {
      const day = toDateKey(new Date(u.createdAt))
      signups.set(day, (signups.get(day) ?? 0) + 1)
    }
    return {
      users: {
        total: users.length,
        students: count('student'),
        admins: count('admin'),
        newLast7Days: users.filter((u) => now - new Date(u.createdAt).getTime() < 7 * DAY).length,
      },
      content: { idioms: IDIOMS.length },
      activity: { gradings: sum('gradings'), quizzes: sum('quizzes'), flashcardReviews: sum('flashcardReviews') },
      signupsByDay: Array.from({ length: SIGNUP_DAYS }, (_, i) => {
        const date = toDateKey(new Date(now - (SIGNUP_DAYS - 1 - i) * DAY))
        return { date, count: signups.get(date) ?? 0 }
      }),
    }
  },

  users({ q, role, page = 1, pageSize = 20 }: AdminUserQuery): Paginated<AdminUser> {
    requireAdmin()
    const needle = q ? normalize(q) : ''
    const rows = allUsers().filter(
      (u) => (!role || u.role === role) && (!needle || normalize(`${u.name} ${u.email}`).includes(needle)),
    )
    return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(toAdminUser), total: rows.length, page, pageSize }
  },

  setUserActive(id: string, active: boolean): AdminUser {
    requireAdmin()
    if (id === currentUser().id) throw new ApiError(400, 'Bạn không thể khóa chính mình')
    const user = allUsers().find((u) => u.id === id)
    if (!user) throw new ApiError(404, 'Không tìm thấy người dùng')
    const inactive = inactiveIds()
    if (active) inactive.delete(id)
    else inactive.add(id)
    write('admin:inactive', [...inactive])
    return toAdminUser({ ...user, active })
  },
}
