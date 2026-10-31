import { ApiError } from '@/api/client'
import type {
  Idiom,
  Assignment,
  ClassReport,
  ClassStudent,
  Classroom,
  MasteryCell,
  Submission,
  SubmissionStatus,
  TraitId,
  User,
} from '@/types'
import { TRAIT_IDS } from '@/lib/constants'
import { masteryFromScore } from '@/lib/mastery'
import { DAY, TRAIT_PENALTY, avg, byId, idiomOrThrow, loadDbFor } from './db'
import { gradeAnswer } from './grader'
import { IDIOMS } from './idioms.data'
import { read, seededRandom, uid, write } from './store'

interface StoredClass {
  id: string
  name: string
  code: string
  teacherId: string | null
  teacherName: string
  studentIds: string[]
  createdAt: string
}

interface FakeStudent {
  id: string
  classId: string
  name: string
  email: string
  lastActiveAt: string | null
  traitScores: Record<TraitId, { avg: number | null; attempts: number }>
}

interface StoredAssignment {
  id: string
  classId: string
  title: string
  instructions: string
  idiomIds: number[]
  dueAt: string
  createdAt: string
}

interface ClassroomStore {
  classes: StoredClass[]
  fakeStudents: FakeStudent[]
  assignments: StoredAssignment[]
  submissions: Submission[]
}

const KEY = 'classroom:v2'
export const DEMO_CLASS_ID = 'class-10a1'

const STUDENT_NAMES = [
  'Nguyễn Minh Anh', 'Trần Gia Bảo', 'Lê Thảo Chi', 'Phạm Đức Duy', 'Hoàng Thu Hà', 'Vũ Quang Huy',
  'Đặng Khánh Linh', 'Bùi Tuấn Kiệt', 'Đỗ Ngọc Mai', 'Hồ Bảo Nam', 'Ngô Phương Nhi', 'Dương Hải Phong',
  'Lý Như Quỳnh', 'Phan Minh Quân', 'Trịnh Thanh Tâm', 'Mai Anh Thư', 'Đinh Gia Tuệ', 'Tạ Hoài Vy',
  'Lương Đức Việt', 'Chu Khánh Vân', 'Cao Bảo Ngọc', 'Kiều Trung Hiếu', 'Lâm Tú Uyên', 'Tôn Thất Long',
]

function load(): ClassroomStore {
  const existing = read<ClassroomStore | null>(KEY, null)
  if (existing) return existing
  const store = seed()
  write(KEY, store)
  return store
}

const save = (store: ClassroomStore) => write(KEY, store)

// Answers of decreasing quality so the seeded submissions get realistic grades from the mock grader
function sampleAnswer(idiomId: number, ability: number, rng: () => number): string {
  const idiom = idiomOrThrow(idiomId)
  const roll = ability + (rng() - 0.5)
  if (roll > 0.75) return idiom.explanation.split('.')[0] + '.'
  if (roll > 0.45) return idiom.explanation.split(/[,.]/)[0] + '.'
  return `Câu này nói về ${idiom.phrase.toLowerCase()}.`
}

// Short, readable VIVID entries matching a condition, picked deterministically for the demo class
function pickIdioms(match: (i: Idiom) => boolean, count: number): number[] {
  return IDIOMS.filter((i) => match(i) && i.explanation.length >= 30 && i.explanation.length <= 140)
    .slice(0, count)
    .map((i) => i.id)
}

function seed(): ClassroomStore {
  const rng = seededRandom('vivid-classroom')
  const now = Date.now()
  const store: ClassroomStore = {
    classes: [
      {
        id: DEMO_CLASS_ID,
        name: 'Lớp 10A1 · Ngữ văn',
        code: 'VND10A',
        teacherId: null,
        teacherName: 'Nguyễn Thị Lan',
        studentIds: [],
        createdAt: new Date(now - 40 * DAY).toISOString(),
      },
    ],
    fakeStudents: [],
    assignments: [
      {
        id: 'asg-criticism',
        classId: DEMO_CLASS_ID,
        title: 'Giải nghĩa 5 câu phê phán thói xấu',
        instructions: 'Giải nghĩa từng câu bằng lời của em, nêu rõ câu đang chê thói xấu nào.',
        idiomIds: pickIdioms((i) => i.topic === 'criticism' && i.traits.includes('pragmatic'), 5),
        dueAt: new Date(now - 3 * DAY).toISOString(),
        createdAt: new Date(now - 10 * DAY).toISOString(),
      },
      {
        id: 'asg-weather',
        classId: DEMO_CLASS_ID,
        title: 'Kinh nghiệm dân gian chỉ mang nghĩa đen',
        instructions: 'Các câu này chỉ mang nghĩa đen. Giải thích kinh nghiệm mà mỗi câu ghi lại, đừng suy ra nghĩa bóng.',
        idiomIds: pickIdioms((i) => i.traits.includes('literal') && i.traits.includes('folk_knowledge'), 4),
        dueAt: new Date(now + 2 * DAY).toISOString(),
        createdAt: new Date(now - 4 * DAY).toISOString(),
      },
      {
        id: 'asg-sino',
        classId: DEMO_CLASS_ID,
        title: 'Từ Hán Việt trong thành ngữ',
        instructions: 'Tra nghĩa từng từ Hán Việt trước khi giải nghĩa cả câu.',
        idiomIds: pickIdioms((i) => i.traits.includes('sino_vietnamese') && !!i.glossary?.length, 4),
        dueAt: new Date(now + 9 * DAY).toISOString(),
        createdAt: new Date(now - 1 * DAY).toISOString(),
      },
    ],
    submissions: [],
  }

  STUDENT_NAMES.forEach((name, i) => {
    const ability = 0.25 + rng() * 0.7
    const traitScores = {} as FakeStudent['traitScores']
    for (const trait of TRAIT_IDS) {
      const attempts = rng() < 0.08 ? 0 : 2 + Math.floor(rng() * 9)
      const score = 1 + ability * 4 - (TRAIT_PENALTY[trait] ?? 0) + (rng() - 0.5)
      traitScores[trait] = { avg: attempts ? Math.max(0, Math.min(5, score)) : null, attempts }
    }
    const student: FakeStudent = {
      id: `fake-${i + 1}`,
      classId: DEMO_CLASS_ID,
      name,
      email: `hs${String(i + 1).padStart(2, '0')}@truong.example`,
      lastActiveAt: rng() < 0.1 ? null : new Date(now - Math.floor(rng() * 6) * DAY).toISOString(),
      traitScores,
    }
    store.fakeStudents.push(student)

    for (const asg of store.assignments) {
      const due = new Date(asg.dueAt).getTime()
      const pastDue = due < now
      const submitChance = pastDue ? 0.85 : due - now < 3 * DAY ? 0.5 : 0.15
      if (rng() > submitChance * (0.6 + ability * 0.5)) continue
      const submittedAt = pastDue && rng() < 0.15 ? due + DAY * rng() : Math.min(now, due) - DAY * 2 * rng()
      store.submissions.push(
        buildSubmission(asg, student.id, name, asg.idiomIds.map((idiomId) => ({ idiomId, answer: sampleAnswer(idiomId, ability, rng) })), submittedAt),
      )
    }
  })
  return store
}

function buildSubmission(
  asg: StoredAssignment,
  studentId: string,
  studentName: string,
  answers: { idiomId: number; answer: string }[],
  submittedAtMs: number,
): Submission {
  const items = answers.map(({ idiomId, answer }) => {
    const idiom = idiomOrThrow(idiomId)
    const { scores, overall, feedback } = gradeAnswer(idiom, answer)
    return { idiomId, phrase: idiom.phrase, answer, overall, scores, summary: feedback.summary }
  })
  return {
    id: uid(),
    assignmentId: asg.id,
    studentId,
    studentName,
    status: submittedAtMs > new Date(asg.dueAt).getTime() ? 'late' : 'submitted',
    submittedAt: new Date(submittedAtMs).toISOString(),
    items,
    aiScore: Math.round((avg(items.map((i) => i.overall)) ?? 0) * 10) / 10,
    teacherScore: null,
    teacherComment: null,
  }
}

function classOrThrow(store: ClassroomStore, id: string): StoredClass {
  const cls = store.classes.find((c) => c.id === id)
  if (!cls) throw new ApiError(404, 'Không tìm thấy lớp học')
  return cls
}

function realStudents(cls: StoredClass): User[] {
  const users = Object.values(read<Record<string, User>>('users', {}))
  return users.filter((u) => cls.studentIds.includes(u.id))
}

function rosterSize(store: ClassroomStore, cls: StoredClass) {
  return cls.studentIds.length + store.fakeStudents.filter((s) => s.classId === cls.id).length
}

function classView(store: ClassroomStore, cls: StoredClass): Classroom {
  return {
    id: cls.id,
    name: cls.name,
    code: cls.code,
    teacherName: cls.teacherName,
    studentCount: rosterSize(store, cls),
    createdAt: cls.createdAt,
  }
}

function visibleClasses(store: ClassroomStore, user: User): StoredClass[] {
  return user.role === 'teacher'
    ? store.classes.filter((c) => c.teacherId === null || c.teacherId === user.id)
    : store.classes.filter((c) => c.studentIds.includes(user.id))
}

function realTraitScores(userId: string) {
  const db = loadDbFor(userId)
  const out = {} as FakeStudent['traitScores']
  for (const trait of TRAIT_IDS) {
    const scores = db.attempts.filter((a) => byId.get(a.idiomId)?.traits.includes(trait)).map((a) => a.overall)
    out[trait] = { avg: avg(scores), attempts: scores.length }
  }
  const last = db.attempts.at(-1)?.createdAt ?? null
  return { traitScores: out, lastActiveAt: last }
}

function studentRows(store: ClassroomStore, cls: StoredClass) {
  const fakes = store.fakeStudents.filter((s) => s.classId === cls.id)
  const reals = realStudents(cls).map((u) => ({ id: u.id, name: u.name, email: u.email, ...realTraitScores(u.id) }))
  return [...reals, ...fakes].map((s) => {
    const all = TRAIT_IDS.flatMap((t) => (s.traitScores[t].avg == null ? [] : [s.traitScores[t]]))
    const attempts = all.reduce((n, t) => n + t.attempts, 0)
    const student: ClassStudent = {
      id: s.id,
      name: s.name,
      email: s.email,
      lastActiveAt: s.lastActiveAt,
      attempts,
      avgScore: attempts ? all.reduce((sum, t) => sum + (t.avg ?? 0) * t.attempts, 0) / attempts : null,
    }
    return { student, traitScores: s.traitScores }
  })
}

function statusFor(asg: StoredAssignment, submission: Submission | undefined): SubmissionStatus {
  if (submission) return submission.status
  return new Date(asg.dueAt).getTime() < Date.now() ? 'missing' : 'assigned'
}

function assignmentView(store: ClassroomStore, asg: StoredAssignment, user: User): Assignment {
  const cls = classOrThrow(store, asg.classId)
  const subs = store.submissions.filter((s) => s.assignmentId === asg.id)
  return {
    ...asg,
    className: cls.name,
    studentCount: rosterSize(store, cls),
    submittedCount: subs.length,
    myStatus: user.role === 'student' ? statusFor(asg, subs.find((s) => s.studentId === user.id)) : undefined,
  }
}

function assignmentOrThrow(store: ClassroomStore, id: string): StoredAssignment {
  const asg = store.assignments.find((a) => a.id === id)
  if (!asg) throw new ApiError(404, 'Không tìm thấy bài tập')
  return asg
}

export const classroom = {
  enroll(userId: string, classId = DEMO_CLASS_ID) {
    const store = load()
    const cls = classOrThrow(store, classId)
    if (!cls.studentIds.includes(userId)) cls.studentIds.push(userId)
    save(store)
  },
  listClasses(user: User): Classroom[] {
    const store = load()
    return visibleClasses(store, user).map((c) => classView(store, c))
  },
  getClass(user: User, id: string): Classroom {
    const store = load()
    const cls = visibleClasses(store, user).find((c) => c.id === id)
    if (!cls) throw new ApiError(404, 'Không tìm thấy lớp học')
    return classView(store, cls)
  },
  createClass(user: User, name: string): Classroom {
    if (user.role !== 'teacher') throw new ApiError(403, 'Chỉ giáo viên được tạo lớp')
    const store = load()
    const cls: StoredClass = {
      id: `class-${uid()}`,
      name: name.trim(),
      code: uid().slice(0, 6).toUpperCase(),
      teacherId: user.id,
      teacherName: user.name,
      studentIds: [],
      createdAt: new Date().toISOString(),
    }
    store.classes.push(cls)
    save(store)
    return classView(store, cls)
  },
  joinClass(user: User, code: string): Classroom {
    const store = load()
    const cls = store.classes.find((c) => c.code === code.trim().toUpperCase())
    if (!cls) throw new ApiError(404, 'Mã lớp không đúng')
    if (!cls.studentIds.includes(user.id)) cls.studentIds.push(user.id)
    save(store)
    return classView(store, cls)
  },
  students(user: User, id: string): ClassStudent[] {
    const store = load()
    classroom.getClass(user, id)
    return studentRows(store, classOrThrow(store, id))
      .map((r) => r.student)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  },
  report(user: User, id: string): ClassReport {
    const store = load()
    classroom.getClass(user, id)
    const rows = studentRows(store, classOrThrow(store, id))
      .map(({ student, traitScores }) => {
        const mastery = {} as Record<TraitId, MasteryCell>
        for (const t of TRAIT_IDS) {
          const { avg: a, attempts } = traitScores[t]
          mastery[t] = { level: masteryFromScore(a), avgScore: a, attempts }
        }
        return { student, mastery }
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name, 'vi'))
    const traitAverages = {} as ClassReport['traitAverages']
    for (const t of TRAIT_IDS) {
      traitAverages[t] = avg(rows.flatMap((r) => (r.mastery[t].avgScore == null ? [] : [r.mastery[t].avgScore!])))
    }
    return { classId: id, rows, traitAverages }
  },
  listAssignments(user: User, classId?: string): Assignment[] {
    const store = load()
    const classIds = new Set(visibleClasses(store, user).map((c) => c.id))
    return store.assignments
      .filter((a) => classIds.has(a.classId) && (!classId || a.classId === classId))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((a) => assignmentView(store, a, user))
  },
  getAssignment(user: User, id: string): Assignment {
    const store = load()
    const asg = assignmentOrThrow(store, id)
    if (!visibleClasses(store, user).some((c) => c.id === asg.classId)) throw new ApiError(404, 'Không tìm thấy bài tập')
    return assignmentView(store, asg, user)
  },
  createAssignment(user: User, input: Omit<StoredAssignment, 'id' | 'createdAt'>): Assignment {
    if (user.role !== 'teacher') throw new ApiError(403, 'Chỉ giáo viên được giao bài')
    if (!input.title.trim()) throw new ApiError(400, 'Vui lòng nhập tên bài tập')
    if (input.idiomIds.length === 0) throw new ApiError(400, 'Chọn ít nhất một câu')
    input.idiomIds.forEach(idiomOrThrow)
    const store = load()
    classOrThrow(store, input.classId)
    const asg: StoredAssignment = { ...input, title: input.title.trim(), id: `asg-${uid()}`, createdAt: new Date().toISOString() }
    store.assignments.push(asg)
    save(store)
    return assignmentView(store, asg, user)
  },
  submissions(user: User, id: string): Submission[] {
    const store = load()
    const asg = assignmentOrThrow(store, id)
    const cls = classOrThrow(store, asg.classId)
    if (user.role !== 'teacher') throw new ApiError(403, 'Chỉ giáo viên xem được bài nộp')
    const subs = store.submissions.filter((s) => s.assignmentId === id)
    const roster = studentRows(store, cls).map((r) => r.student)
    return roster
      .map(
        (s): Submission =>
          subs.find((x) => x.studentId === s.id) ?? {
            id: `none-${s.id}`,
            assignmentId: id,
            studentId: s.id,
            studentName: s.name,
            status: statusFor(asg, undefined),
            submittedAt: null,
            items: [],
            aiScore: null,
            teacherScore: null,
            teacherComment: null,
          },
      )
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))
  },
  mySubmission(user: User, id: string): Submission | null {
    return load().submissions.find((s) => s.assignmentId === id && s.studentId === user.id) ?? null
  },
  submit(user: User, id: string, answers: { idiomId: number; answer: string }[]): Submission {
    const store = load()
    const asg = assignmentOrThrow(store, id)
    const missing = asg.idiomIds.filter((idiomId) => !answers.find((a) => a.idiomId === idiomId)?.answer.trim())
    if (missing.length) throw new ApiError(400, 'Em cần giải nghĩa đủ tất cả các câu trước khi nộp')
    const submission = buildSubmission(asg, user.id, user.name, answers, Date.now())
    store.submissions = [...store.submissions.filter((s) => !(s.assignmentId === id && s.studentId === user.id)), submission]
    save(store)
    return submission
  },
  review(user: User, submissionId: string, score: number, comment: string): Submission {
    if (user.role !== 'teacher') throw new ApiError(403, 'Chỉ giáo viên được chấm bài')
    if (score < 0 || score > 5) throw new ApiError(400, 'Điểm phải từ 0 đến 5')
    const store = load()
    const sub = store.submissions.find((s) => s.id === submissionId)
    if (!sub) throw new ApiError(404, 'Không tìm thấy bài nộp')
    Object.assign(sub, { teacherScore: score, teacherComment: comment.trim() || null, status: 'returned' })
    save(store)
    return sub
  },
}
