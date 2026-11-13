import { useSyncExternalStore } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900">{t.title}</p>
            <p className="mt-0.5 text-sm text-stone-600">{t.message}</p>
          </div>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Đóng thông báo" className="text-stone-400 hover:text-stone-700">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
