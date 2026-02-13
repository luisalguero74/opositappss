import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-semibold text-gray-900">
            opositAPPSS
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Suscripción
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
