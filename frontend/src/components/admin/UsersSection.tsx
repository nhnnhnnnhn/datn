import { useDeferredValue, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '@/api'
import { useAuth } from '@/context/AuthContext'
import type { AdminUser, Role } from '@/types'
import { Tag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState, ErrorMessage, Spinner } from '@/components/ui/Feedback'
import { createLogger } from '@/lib/logger'
import { roleLabel } from '@/lib/role'
import { formatRelative } from '@/lib/text'
import { UserForm } from './UserForm'

const log = createLogger('ADMIN')
const PAGE_SIZE = 10

function LockButton({ user, onToggle, busy }: { user: AdminUser; onToggle: () => void; busy: boolean }) {
  const [confirming, setConfirming] = useState(false)

  if (!user.active) {
    return (
      <Button variant="outline" size="sm" loading={busy} onClick={onToggle}>
        Mở khóa
      </Button>
    )
  }
  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Khóa
      </Button>
    )
  }
  return (
    <span className="inline-flex gap-1.5">
      <Button
        variant="dark"
        size="sm"
        loading={busy}
        onClick={() => {
          onToggle()
          setConfirming(false)
        }}
      >
        Xác nhận khóa
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
        Hủy
      </Button>
    </span>
  )
}

export function UsersSection() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | undefined>()
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const deferredQ = useDeferredValue(q.trim())

  const users = useQuery({
    queryKey: ['admin', 'users', { q: deferredQ, role, page }],
    queryFn: () => api.admin.users({ q: deferredQ || undefined, role: role || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    meta: { tag: 'ADMIN' },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.admin.updateUser(id, { active }),
    meta: { tag: 'ADMIN' },
    onSuccess: (updated) => {
      log.info('user active changed', { userId: updated.id, active: updated.active })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    meta: { tag: 'ADMIN' },
    onSuccess: (_, id) => {
      log.info('user deleted', { userId: id })
      if (users.data?.items.length === 1 && page > 1) setPage(page - 1)
      setDeleting(null)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const lastPage = Math.max(1, Math.ceil((users.data?.total ?? 0) / PAGE_SIZE))

  function openForm(user?: AdminUser) {
    setEditing(user)
    setFormOpen(true)
  }

  return (
    <Section
      title="Người dùng"
      count={users.data?.total}
      action={
        <Button size="sm" onClick={() => openForm()}>
          <Plus className="size-4" />
          Thêm người dùng
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="Tìm theo tên hoặc email"
          aria-label="Tìm người dùng"
          className="min-w-60 flex-1"
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '')
            setPage(1)
          }}
          aria-label="Lọc theo vai trò"
          className="w-40"
        >
          <option value="">Mọi vai trò</option>
          <option value="student">Học sinh</option>
          <option value="admin">Quản trị viên</option>
        </Select>
      </div>

      {toggle.error && (
        <div className="mb-3">
          <ErrorMessage error={toggle.error} />
        </div>
      )}

      {users.error ? (
        <div className="space-y-3">
          <ErrorMessage error={users.error} />
          <Button variant="outline" size="sm" onClick={() => users.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !users.data ? (
        <Spinner />
      ) : users.data.items.length === 0 ? (
        <EmptyState title="Không có người dùng phù hợp" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Người dùng</th>
                <th className="py-2 pr-3 font-medium">Vai trò</th>
                <th className="py-2 pr-3 font-medium">Đăng ký</th>
                <th className="py-2 pr-3 font-medium">Hoạt động gần nhất</th>
                <th className="py-2 text-right font-medium">Tài khoản</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.data.items.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-stone-900">{u.name}</div>
                    <div className="text-xs text-stone-500">{u.email}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-stone-700">{roleLabel(u.role)}</td>
                  <td className="py-2.5 pr-3 text-stone-700">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="py-2.5 pr-3 text-stone-700">{u.lastActiveAt ? formatRelative(u.lastActiveAt) : '—'}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {u.active ? null : <Tag className="bg-red-50 text-red-700">Đã khóa</Tag>}
                      {u.id === me?.id && <span className="text-xs text-stone-500">Bạn</span>}
                      <Button variant="outline" size="sm" onClick={() => openForm(u)} aria-label={`Sửa ${u.name}`}>
                        Sửa
                      </Button>
                      {u.id !== me?.id && (
                        <>
                          <LockButton
                            user={u}
                            busy={toggle.isPending && toggle.variables?.id === u.id}
                            onToggle={() => toggle.mutate({ id: u.id, active: !u.active })}
                          />
                          <Button variant="danger" size="sm" onClick={() => setDeleting(u)} aria-label={`Xóa ${u.name}`}>
                            Xóa
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span>
            Trang {page} / {lastPage}
          </span>
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </div>
      )}

      <UserForm open={formOpen} user={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa người dùng"
        message={
          <div className="space-y-3">
            <p>
              Xóa tài khoản <strong>{deleting?.name}</strong> ({deleting?.email})? Toàn bộ dữ liệu học của người này cũng bị
              xóa và không thể khôi phục.
            </p>
            {remove.error != null && <ErrorMessage error={remove.error} />}
          </div>
        }
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => {
          remove.reset()
          setDeleting(null)
        }}
      />
    </Section>
  )
}
