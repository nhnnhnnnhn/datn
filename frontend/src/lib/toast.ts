import { ApiError } from '@/api/client'

export interface Toast {
  id: number
  title: string
  message: string
}

const DURATION_MS = 6000
let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getToasts = () => toasts

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function showToast(title: string, message: string) {
  if (toasts.some((t) => t.title === title && t.message === message)) return
  const id = nextId++
  toasts = [...toasts.slice(-2), { id, title, message }]
  emit()
  setTimeout(() => dismissToast(id), DURATION_MS)
}

// Only failures the user cannot fix from the form: no connection, a route the server lacks, or a server error.
// 4xx validation errors are already shown next to the form, and 401 signs the user out.
export function apiFailureText(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  if (err.status === 0) return 'Mất kết nối tới máy chủ.'
  if (err.status === 404 && err.message === 'Not Found') return 'Chức năng này chưa có trên máy chủ.'
  if (err.status === 404) return 'Không tìm thấy dữ liệu yêu cầu.'
  if (err.status >= 500) return `Máy chủ gặp lỗi (${err.status}). Vui lòng thử lại sau.`
  return null
}

export function toastApiFailure(err: unknown) {
  const text = apiFailureText(err)
  if (text) showToast('Lỗi gọi API', text)
}
