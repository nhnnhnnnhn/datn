import { BookOpen, LayoutDashboard, Users } from 'lucide-react'

export const ADMIN_TABS = [
  { tab: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { tab: 'users', label: 'Người dùng', icon: Users },
  { tab: 'idioms', label: 'Thành ngữ', icon: BookOpen },
] as const

export type AdminTab = (typeof ADMIN_TABS)[number]['tab']

export const parseAdminTab = (value: string | null): AdminTab => ADMIN_TABS.find((t) => t.tab === value)?.tab ?? 'overview'
