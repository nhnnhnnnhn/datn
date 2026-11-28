import { useSearchParams } from 'react-router'
import { IdiomsSection } from '@/components/admin/IdiomsSection'
import { StatsSection } from '@/components/admin/StatsSection'
import { UsersSection } from '@/components/admin/UsersSection'
import { parseAdminTab } from '@/lib/adminTabs'

export default function AdminHome() {
  const [params] = useSearchParams()
  const tab = parseAdminTab(params.get('tab'))

  return (
    <>
      {tab === 'overview' && <StatsSection />}
      {tab === 'users' && <UsersSection />}
      {tab === 'idioms' && <IdiomsSection />}
    </>
  )
}
