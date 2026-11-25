const DAY = 86_400_000

export function dueLabel(dueAt: string): string {
  const diff = new Date(dueAt).getTime() - Date.now()
  const days = Math.round(Math.abs(diff) / DAY)
  const date = new Date(dueAt).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })
  if (diff < 0) return days === 0 ? `Hết hạn hôm nay (${date})` : `Quá hạn ${days} ngày (${date})`
  if (days === 0) return `Hạn hôm nay (${date})`
  return `Còn ${days} ngày (${date})`
}
