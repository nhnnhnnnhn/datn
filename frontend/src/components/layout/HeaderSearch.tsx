import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '@/api'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { firstSentence } from '@/lib/text'
import { cn } from '@/lib/cn'

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 6

export function HeaderSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const listId = useId()
  const wrapperRef = useRef<HTMLFormElement>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const term = q.trim()
  const debounced = useDebouncedValue(term, 250)
  const searching = open && term.length >= MIN_QUERY_LENGTH
  const results = useQuery({
    queryKey: ['idioms', 'quick-search', debounced],
    queryFn: () => api.idioms.list({ q: debounced, pageSize: MAX_RESULTS }),
    enabled: debounced.length >= MIN_QUERY_LENGTH,
    meta: { tag: 'IDIOM' },
  })
  const items = debounced === term ? (results.data?.items ?? []) : []
  const waiting = debounced !== term || results.isFetching

  useEffect(() => {
    setOpen(false)
    setQ('')
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function goToList() {
    if (term) navigate(`/idioms?q=${encodeURIComponent(term)}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const picked = items[active]
    if (picked) navigate(`/idioms/${picked.id}`)
    else goToList()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (items.length === 0) return
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + items.length) % items.length)
    }
  }

  return (
    <form ref={wrapperRef} onSubmit={onSubmit} role="search" className="relative hidden lg:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Tra thành ngữ, tục ngữ"
        aria-label="Tra nhanh"
        role="combobox"
        aria-expanded={searching}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="h-8 w-56 rounded-md border border-stone-300 bg-stone-50 pr-3 pl-8 text-sm placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:outline-none"
      />

      {searching && (
        <div className="absolute top-full right-0 z-40 mt-1.5 w-[26rem] overflow-hidden rounded-md border border-stone-200 bg-white text-sm shadow-lg">
          {results.error ? (
            <p role="alert" className="px-3 py-3 text-red-700">
              Không tìm được, thử lại sau.
            </p>
          ) : waiting && items.length === 0 ? (
            <p className="px-3 py-3 text-stone-500">Đang tìm…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-stone-500">Không có câu nào phù hợp.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Kết quả tra nhanh">
              {items.map((idiom, i) => (
                <li
                  key={idiom.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    navigate(`/idioms/${idiom.id}`)
                  }}
                  className={cn('cursor-pointer px-3 py-2', i === active ? 'bg-brand-50' : 'hover:bg-stone-50')}
                >
                  <span className="block font-serif font-semibold text-stone-900">{idiom.phrase}</span>
                  <span className="mt-0.5 block truncate text-xs text-stone-500">{firstSentence(idiom.explanation)}</span>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                goToList()
              }}
              className="block w-full border-t border-stone-100 px-3 py-2 text-left text-xs text-brand-700 hover:bg-stone-50"
            >
              Xem tất cả kết quả cho “{term}”
            </button>
          )}
        </div>
      )}
    </form>
  )
}
