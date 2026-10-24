import { Link } from 'react-router'
import { buttonClass } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-serif text-5xl font-bold text-brand-600">404</p>
      <p className="mt-3 text-stone-600">“Tìm đỏ mắt” mà vẫn không thấy trang này.</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-6')}>
        Về trang chủ
      </Link>
    </div>
  )
}
