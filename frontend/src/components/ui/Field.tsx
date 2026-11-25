import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base =
  'w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-9', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'py-2.5 leading-relaxed', className)} {...rest} />
}

const CHEVRON = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#78716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>",
)

// The native arrow hugs the right border, so it is replaced by a chevron with room around it
const SELECT_ARROW = {
  backgroundImage: `url("data:image/svg+xml,${CHEVRON}")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem',
}

export function Select({ className, children, style, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, 'h-9 appearance-none bg-no-repeat pr-10', className)} style={{ ...SELECT_ARROW, ...style }} {...rest}>
      {children}
    </select>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
      {children}
    </label>
  )
}
