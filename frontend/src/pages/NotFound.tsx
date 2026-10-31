import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-2xl font-semibold text-stone-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-stone-600">Đường dẫn không tồn tại hoặc đã bị đổi.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
        Về trang chủ
      </Link>
    </div>
  )
}
