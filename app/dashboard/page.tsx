'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import Link from 'next/link'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import HelpButton from '@/components/HelpButton'
import MonetizationWrapper from '@/components/monetization/MonetizationWrapper'
import UserMenu from '@/components/UserMenu'

export default function Dashboard() {
  const { data: session } = useSession() as { data: Session | null }


  if (!session) return <div>Cargando...</div>

  const isAdmin = String(session.user?.role || '').toLowerCase() === 'admin'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <SubscriptionBanner />
      <HelpButton />
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Bienvenido a opositAPPSS</h1>
            <p className="text-gray-600 mt-1 text-sm">Hola, {session.user?.email}</p>
          </div>
          <UserMenu />
        </div>
        
        {/* Grid de 3 columnas en escritorio, más compacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Cuestionarios de Temario */}
          <Link href="/dashboard/theory" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Cuestionarios</h2>
              <div className="text-white text-3xl">📚</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Practica con preguntas del temario de oposiciones.</p>
            </div>
          </Link>

          {/* Supuestos Prácticos */}
          <Link href="/dashboard/practical" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Supuestos</h2>
              <div className="text-white text-3xl">💼</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Resuelve casos prácticos para mejorar tu preparación.</p>
            </div>
          </Link>

          {/* Simulacros de Examen */}
          <Link href="/dashboard/exam-simulation" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Simulacros</h2>
              <div className="text-white text-3xl">📝</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Exámenes completos de 70+15 preguntas y 120 min.</p>
            </div>
          </Link>

          {/* Examen Oficial */}
          <Link href="/exam-mode" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group relative">
            <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">OFICIAL</div>
            <div className="bg-gradient-to-r from-amber-600 to-yellow-500 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Examen Oficial</h2>
              <div className="text-white text-3xl">🏆</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">70 preguntas test + 15 supuesto práctico. Ranking global.</p>
              <p className="text-xs text-blue-600 mt-2 font-semibold">→ Ver ranking</p>
            </div>
          </Link>

          {/* Test a la Carta */}
          <Link href="/dashboard/custom-test" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Test a la Carta</h2>
              <div className="text-white text-3xl">🎯</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Crea tests personalizados por temas.</p>
            </div>
          </Link>

          {/* Mis Estadísticas */}
          <Link href="/analytics-dashboard" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Estadísticas Avanzadas</h2>
              <div className="text-white text-3xl">📊</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Analiza tu progreso y rendimiento.</p>
            </div>
          </Link>

          {/* Casos Prácticos */}
          <Link href="/practical-cases" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Casos Prácticos</h2>
              <div className="text-white text-3xl">📋</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Practica con casos reales del examen.</p>
            </div>
          </Link>

          {/* Foro */}
          <Link href="/forum" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Foro</h2>
              <div className="text-white text-3xl">🗣️</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Plantea dudas y comparte soluciones.</p>
            </div>
          </Link>

          {/* Canal en directo (usuarios) */}
          <Link href="/room/moderation" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Canal en Directo</h2>
              <div className="text-white text-3xl">🎥</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Únete a la videollamada de dudas (moderación).</p>
            </div>
          </Link>

          {/* Temario */}
          <Link href="/dashboard/temario" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Temario</h2>
              <div className="text-white text-3xl">📚</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Estadísticas por tema y recomendaciones.</p>
            </div>
          </Link>

          {/* Estadísticas */}
          <Link href="/statistics" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Estadísticas</h2>
              <div className="text-white text-3xl">📊</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Analiza tu progreso y mejora tu preparación.</p>
            </div>
          </Link>

          {/* Aulas Virtuales */}
          <Link href="/classrooms" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Aulas Virtuales</h2>
              <div className="text-white text-3xl">🎓</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Clases en línea y sesiones en vivo.</p>
            </div>
          </Link>

          {/* Asistente IA */}
          <Link href="/asistente-estudio" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Asistente IA</h2>
              <div className="text-white text-3xl">🤖</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Pregunta a la IA sobre el temario oficial.</p>
            </div>
          </Link>

          {/* Preguntas Falladas */}
          <Link href="/failed-questions" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Falladas</h2>
              <div className="text-white text-3xl">❌</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Repasa las preguntas que has fallado.</p>
            </div>
          </Link>

          {/* Preguntas Marcadas */}
          <Link href="/marked-questions" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Marcadas</h2>
              <div className="text-white text-3xl">📌</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Preguntas guardadas para repasar.</p>
            </div>
          </Link>

          {/* Repetición Espaciada */}
          <Link href="/spaced-repetition" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Repaso Inteligente</h2>
              <div className="text-white text-3xl">🧠</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Sistema de repetición espaciada.</p>
            </div>
          </Link>

          {/* Logros */}
          <Link href="/achievements" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Logros</h2>
              <div className="text-white text-3xl">🏆</div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">Desbloquea logros estudiando.</p>
            </div>
          </Link>
        </div>

        {/* Admin - Solo para administradores */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Link href="/admin" className="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Panel de Administrador</h2>
                <div className="text-white text-3xl">⚙️</div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm">Gestiona cuestionarios y usuarios de la plataforma.</p>
              </div>
            </Link>

            <Link href="/admin/rooms" className="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Moderación (Salas)</h2>
                <div className="text-white text-3xl">🎥</div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm">Controla salas y participantes en directo.</p>
              </div>
            </Link>
          </div>
        )}
        
        {/* Monetización */}
        <MonetizationWrapper position="dashboard" />
        
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          Cerrar Sesión
        </button>
      </div>
      </div>
    </div>
  )
}