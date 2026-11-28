import { ApiError } from '@/api/client'
import type {
  AdminStats,
  AdminUser,
  AdminUserInput,
  AdminUserPatch,
  AdminUserQuery,
  Idiom,
  IdiomInput,
  Paginated,
  Role,
  TopicId,
  User,
} from '@/types'
import { TOPIC_IDS } from '@/lib/constants'
import { normalize, toDateKey } from '@/lib/text'
import { IDIOMS, archiveIdiom, createIdiom, updateIdiom } from './idiomStore'
import { DAY, currentUser, dbKey, type Db } from './db'
import { read, remove, seededRandom, uid, write } from './store'

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

const SEEDED_FLAG = 'admin:seeded:v1'
const SEED_META_KEY = 'admin:seedMeta:v1'

interface SeedMeta {
  lastActiveAt: string | null
  activity: Activity
}

// Demo accounts that make the list and stats look lived in; once seeded they are ordinary stored users
function ensureSeeded() {
  if (read<boolean>(SEEDED_FLAG, false)) return
  const rng = seededRandom('admin-users')
  const now = Date.now()
  const users = read<Record<string, User>>('users', {})
  const meta: Record<string, SeedMeta> = {}
  for (let i = 0; i < 24; i++) {
    const name = `${FAMILY[Math.floor(rng() * FAMILY.length)]} ${GIVEN[Math.floor(rng() * GIVEN.length)]}`
    const createdAt = new Date(now - Math.floor(rng() * 30) * DAY - Math.floor(rng() * DAY)).toISOString()
    const recentlyActive = rng() < 0.75
    const id = `seed-${i}`
    const email = `${normalize(name).replace(/\s+/g, '.')}.${i}@vivid.test`
    users[email] = { id, name, email, role: 'student', dailyGoal: 10, createdAt }
    meta[id] = {
      lastActiveAt: recentlyActive ? new Date(now - Math.floor(rng() * 5) * DAY).toISOString() : null,
      activity: {
        gradings: recentlyActive ? Math.floor(rng() * 30) : 0,
        quizzes: recentlyActive ? Math.floor(rng() * 12) : 0,
        flashcardReviews: recentlyActive ? Math.floor(rng() * 200) : 0,
      },
    }
  }
  write('users', users)
  write(SEED_META_KEY, meta)
  write(SEEDED_FLAG, true)
}

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
  ensureSeeded()
  const inactive = inactiveIds()
  const session = currentUser()
  const meta = read<Record<string, SeedMeta>>(SEED_META_KEY, {})
  return Object.values(read<Record<string, User>>('users', {}))
    .map((u): Row => {
      const seed = meta[u.id]
      const db = seed ? null : read<Db | null>(dbKey(u.id), null)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role ?? 'student',
        active: !inactive.has(u.id),
        createdAt: u.createdAt,
        lastActiveAt: seed ? seed.lastActiveAt : u.id === session.id ? new Date().toISOString() : null,
        activity: seed
          ? seed.activity
          : db
            ? { gradings: db.attempts.length, quizzes: db.quizResults.length, flashcardReviews: db.reviews.length }
            : undefined,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function findStored(id: string): { key: string; user: User } {
  const entry = Object.entries(read<Record<string, User>>('users', {})).find(([, u]) => u.id === id)
  if (!entry) throw new ApiError(404, 'Không tìm thấy người dùng')
  return { key: entry[0], user: entry[1] }
}

function assertAdminRemains(users: User[], inactive: Set<string>) {
  if (!users.some((u) => u.role === 'admin' && !inactive.has(u.id))) {
    throw new ApiError(400, 'Hệ thống phải còn ít nhất một quản trị viên đang hoạt động')
  }
}

const isRole = (value: string): value is Role => value === 'student' || value === 'admin'

function byTopic(): Record<TopicId, number> {
  const counts = Object.fromEntries(TOPIC_IDS.map((id) => [id, 0])) as Record<TopicId, number>
  for (const idiom of IDIOMS) counts[idiom.topic] += 1
  return counts
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
      content: { idioms: IDIOMS.length, byTopic: byTopic() },
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

  createUser({ name, email, password, role }: AdminUserInput): AdminUser {
    requireAdmin()
    if (!name.trim()) throw new ApiError(400, 'Vui lòng nhập họ tên')
    const key = email.trim().toLowerCase()
    if (!key.includes('@')) throw new ApiError(400, 'Email không hợp lệ')
    if (password.length < 6) throw new ApiError(400, 'Mật khẩu cần tối thiểu 6 ký tự')
    if (!isRole(role)) throw new ApiError(400, 'Vai trò không hợp lệ')
    const users = read<Record<string, User>>('users', {})
    if (users[key]) throw new ApiError(409, 'Email đã được đăng ký')
    const user: User = { id: uid(), name: name.trim(), email: key, role, dailyGoal: 10, createdAt: new Date().toISOString() }
    write('users', { ...users, [key]: user })
    return toAdminUser(allUsers().find((u) => u.id === user.id)!)
  },

  updateUser(id: string, patch: AdminUserPatch): AdminUser {
    requireAdmin()
    const me = currentUser()
    const { key, user } = findStored(id)
    if (patch.name === undefined && patch.role === undefined && patch.active === undefined) {
      throw new ApiError(400, 'Không có thay đổi nào để lưu')
    }
    if (patch.name !== undefined && !patch.name.trim()) throw new ApiError(400, 'Vui lòng nhập họ tên')
    if (patch.role !== undefined && !isRole(patch.role)) throw new ApiError(400, 'Vai trò không hợp lệ')
    if (id === me.id && (patch.role !== undefined || patch.active !== undefined)) {
      throw new ApiError(400, 'Bạn không thể đổi vai trò hoặc khóa chính mình')
    }
    const updated: User = { ...user, name: patch.name?.trim() ?? user.name, role: patch.role ?? user.role }
    const inactive = inactiveIds()
    if (patch.active === true) inactive.delete(id)
    if (patch.active === false) inactive.add(id)
    const users = { ...read<Record<string, User>>('users', {}), [key]: updated }
    assertAdminRemains(Object.values(users), inactive)
    write('users', users)
    write('admin:inactive', [...inactive])
    if (id === me.id) write('session', updated)
    return toAdminUser(allUsers().find((u) => u.id === id)!)
  },

  createIdiom(input: IdiomInput): Idiom {
    requireAdmin()
    return createIdiom(input)
  },

  updateIdiom(id: number, input: IdiomInput): Idiom {
    requireAdmin()
    return updateIdiom(id, input)
  },

  archiveIdiom(id: number): void {
    requireAdmin()
    archiveIdiom(id)
  },

  deleteUser(id: string): void {
    requireAdmin()
    if (id === currentUser().id) throw new ApiError(400, 'Bạn không thể xóa chính mình')
    const { key } = findStored(id)
    const { [key]: _removed, ...users } = read<Record<string, User>>('users', {})
    const inactive = inactiveIds()
    inactive.delete(id)
    assertAdminRemains(Object.values(users), inactive)
    const { [id]: _seed, ...meta } = read<Record<string, SeedMeta>>(SEED_META_KEY, {})
    write('users', users)
    write('admin:inactive', [...inactive])
    write(SEED_META_KEY, meta)
    remove(dbKey(id))
  },
}
