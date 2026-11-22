import { StatsSection } from '@/components/admin/StatsSection'
import { UsersSection } from '@/components/admin/UsersSection'
import { PageHeader } from '@/components/ui/Card'

export default function AdminHome() {
  return (
    <div className="space-y-10">
      <PageHeader title="Quản trị" description="Thống kê hệ thống và quản lý tài khoản người dùng." />
      <StatsSection />
      <UsersSection />
    </div>
  )
}
