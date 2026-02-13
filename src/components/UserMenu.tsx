'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

export default function UserMenu() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!session?.user) return null

  const isAdmin = String((session.user as unknown as { role?: string }).role ?? '').toLowerCase() === 'admin'

  const userInitials = session.user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
          {userInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900">{session.user.name || 'Usuario'}</p>
          <p className="text-xs text-gray-500">{session.user.email}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Info Usuario */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-900">{session.user.name || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
          </div>

          {/* Menu Items */}
          <nav className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              📊 Dashboard
            </Link>

            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              ❓ Ayuda
            </Link>

            <Link
              href="/repositorio"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              📚 Repositorio
            </Link>
            <Link
              href="/dashboard/account"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              ⚙️ Configuración
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              💳 Suscripción
            </Link>

            <Link
              href="/dashboard/subscription"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              💳 Mi suscripción
            </Link>

            <Link
              href="/pricing#becas"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              🎓 Becas
            </Link>

            {isAdmin && (
              <>
                <div className="my-2 border-t border-gray-100" />
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ⚙️ Panel Admin
                </Link>
                <Link
                  href="/admin/backups"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🗄️ Backups
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ⚙️ Ajustes
                </Link>
                <Link
                  href="/admin/repositorio"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  📚 Admin Repositorio
                </Link>
                <Link
                  href="/admin/ai-prompt-helper"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🧠 Prompt Helper
                </Link>
                <Link
                  href="/admin/diagnostics"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🩺 Diagnóstico
                </Link>
                <Link
                  href="/admin/analytics"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  📈 Analytics
                </Link>
                <Link
                  href="/admin/audit-logs"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🧾 Audit logs
                </Link>
                <Link
                  href="/admin/import-questions"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  📥 Importar JSON
                </Link>
                <Link
                  href="/admin/questions-create"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ➕ Crear preguntas
                </Link>
                <Link
                  href="/admin/questions-review"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ✅ Revisar Preguntas
                </Link>
                <Link
                  href="/admin/questions"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🧩 Gestionar Preguntas
                </Link>
                <Link
                  href="/admin/questions-quality"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ⭐ Calidad preguntas
                </Link>
                <Link
                  href="/admin/quality-control"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🧹 Control de calidad
                </Link>
                <Link
                  href="/admin/tema-metadata-review"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🏷️ Revisar temas
                </Link>
                <Link
                  href="/admin/exam-official"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  📝 Exámenes oficiales
                </Link>
                <Link
                  href="/admin/test-email"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  ✉️ Test email
                </Link>
                <Link
                  href="/admin/test-planner"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🗓️ Planificador tests
                </Link>
                <Link
                  href="/admin/update-pdf-content"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🧾 Actualizar PDF
                </Link>
                <Link
                  href="/admin/contact-leads"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  📇 Leads contacto
                </Link>
                <Link
                  href="/admin/recover-password"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  🔐 Recover password
                </Link>
                <Link
                  href="/admin/subscriptions"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  💳 Suscripciones
                </Link>
                <Link
                  href="/admin/users"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  👥 Usuarios
                </Link>
              </>
            )}
          </nav>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Logout */}
          <button
            onClick={() => {
              setIsOpen(false)
              signOut({ callbackUrl: '/login' })
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  )
}
