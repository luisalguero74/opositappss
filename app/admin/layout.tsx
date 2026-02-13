import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">
              ← Dashboard
            </Link>
            <span className="text-sm font-semibold text-gray-900">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/monetization"
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Suscripciones
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
