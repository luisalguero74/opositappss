'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import HelpButton from '@/components/HelpButton'
import MonetizationWrapper from '@/components/monetization/MonetizationWrapper'
import UserMenu from '@/components/UserMenu'
import DarkModeToggle from '@/components/DarkModeToggle'
import StudyStreak from '@/components/StudyStreak'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import ProgressCircle from '@/components/ProgressCircle'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { data: session } = useSession() as { data: Session | null }
  const [stats, setStats] = useState({ totalQuestions: 0, correctPercentage: 0, totalAttempts: 0 })

  useEffect(() => {
    if (session) {
      fetch('/api/user/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(() => {})
    }
  }, [session])



  if (!session) return <div>Cargando...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <SubscriptionBanner />
      <HelpButton />
      
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">opositAPPSS</h1>
              <p className="text-blue-100 text-sm mt-1">Hola, {session.user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <Link href="/pricing" className="text-white hover:text-blue-100 text-sm font-medium transition">
                💎 Suscripción
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
        
        {/* Grid de 5 columnas en pantallas grandes */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {/* Práctica Rápida - NUEVO */}
          <Link href="/practica-rapida" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group relative">
            <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">NUEVO</div>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">⚡</div>
              <h2 className="text-sm font-bold text-white text-center">Práctica Rápida</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Repaso de 5 minutos sin tiempo.</p>
            </div>
          </Link>

          {/* Cuestionarios de Temario */}
          <Link href="/dashboard/theory" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📚</div>
              <h2 className="text-sm font-bold text-white text-center">Cuestionarios</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Practica con preguntas del temario.</p>
            </div>
          </Link>

          {/* Supuestos Prácticos */}
          <Link href="/dashboard/practical" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">💼</div>
              <h2 className="text-sm font-bold text-white text-center">Supuestos</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Casos prácticos para mejorar.</p>
            </div>
          </Link>

          {/* Simulacros de Examen */}
          <Link href="/dashboard/exam-simulation" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📝</div>
              <h2 className="text-sm font-bold text-white text-center">Simulacros</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Exámenes completos 70+15.</p>
            </div>
          </Link>

          {/* Modo Examen Strict */}
          <Link href="/exam-mode" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">⏱️</div>
              <h2 className="text-sm font-bold text-white text-center">Modo Examen</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">85 preguntas, 120min real.</p>
            </div>
          </Link>

          {/* Test a la Carta */}
          <Link href="/dashboard/custom-test" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🎯</div>
              <h2 className="text-sm font-bold text-white text-center">Test a la Carta</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Tests personalizados.</p>
            </div>
          </Link>

          {/* Mis Estadísticas */}
          <Link href="/analytics-dashboard" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📊</div>
              <h2 className="text-sm font-bold text-white text-center">Estadísticas</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Progreso y rendimiento.</p>
            </div>
          </Link>

          {/* Casos Prácticos */}
          <Link href="/practical-cases" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📋</div>
              <h2 className="text-sm font-bold text-white text-center">Casos Prácticos</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Casos reales del examen.</p>
            </div>
          </Link>

          {/* Foro */}
          <Link href="/forum" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🗣️</div>
              <h2 className="text-sm font-bold text-white text-center">Foro</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Dudas y soluciones.</p>
            </div>
          </Link>

          {/* Temario */}
          <Link href="/dashboard/temario" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📚</div>
              <h2 className="text-sm font-bold text-white text-center">Temario</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Estadísticas por tema.</p>
            </div>
          </Link>

          {/* Repositorio */}
          <Link href="/repositorio" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-slate-600 to-gray-800 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📚</div>
              <h2 className="text-sm font-bold text-white text-center">Repositorio</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">PDFs y material del curso.</p>
            </div>
          </Link>

          {/* Estadísticas */}
          <Link href="/statistics" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📊</div>
              <h2 className="text-sm font-bold text-white text-center">Mis Datos</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Mejora tu preparación.</p>
            </div>
          </Link>

          {/* Aulas Virtuales */}
          <Link href="/classrooms" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🎓</div>
              <h2 className="text-sm font-bold text-white text-center">Aulas Virtuales</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Clases en vivo.</p>
            </div>
          </Link>

          {/* Asistente IA */}
          <Link href="/asistente-estudio" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🤖</div>
              <h2 className="text-sm font-bold text-white text-center">Asistente IA</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Pregunta a la IA.</p>
            </div>
          </Link>

          {/* Preguntas Falladas */}
          <Link href="/failed-questions" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">❌</div>
              <h2 className="text-sm font-bold text-white text-center">Falladas</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Repasa tus errores.</p>
            </div>
          </Link>

          {/* Preguntas Marcadas */}
          <Link href="/marked-questions" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📌</div>
              <h2 className="text-sm font-bold text-white text-center">Marcadas</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Guardadas para repasar.</p>
            </div>
          </Link>

          {/* Repetición Espaciada */}
          <Link href="/spaced-repetition" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🧠</div>
              <h2 className="text-sm font-bold text-white text-center">Repaso Smart</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Repetición espaciada.</p>
            </div>
          </Link>

          {/* Logros */}
          <Link href="/achievements" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🏆</div>
              <h2 className="text-sm font-bold text-white text-center">Logros</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Desbloquea premios.</p>
            </div>
          </Link>

          {/* Sesiones de Estudio */}
          <Link href="/study-sessions" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🕒</div>
              <h2 className="text-sm font-bold text-white text-center">Sesiones</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Historial de estudio.</p>
            </div>
          </Link>

          {/* Racha de Estudio */}
          <Link href="/study-streak" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🔥</div>
              <h2 className="text-sm font-bold text-white text-center">Mi Racha</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Días consecutivos.</p>
            </div>
          </Link>

          {/* Progreso por Tema */}
          <Link href="/theme-progress" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📈</div>
              <h2 className="text-sm font-bold text-white text-center">Progreso Tema</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Análisis detallado.</p>
            </div>
          </Link>

          {/* Recomendaciones */}
          <Link href="/study-recommendations" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">🎯</div>
              <h2 className="text-sm font-bold text-white text-center">Qué Estudiar</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Recomendaciones IA.</p>
            </div>
          </Link>

          {/* Historial de Intentos */}
          <Link href="/attempt-history" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
            <div className="bg-gradient-to-r from-slate-600 to-blue-600 p-3 flex flex-col items-center justify-center">
              <div className="text-white text-3xl mb-1">📜</div>
              <h2 className="text-sm font-bold text-white text-center">Historial</h2>
            </div>
            <div className="p-3">
              <p className="text-gray-600 text-xs text-center">Todos tus intentos.</p>
            </div>
          </Link>
        </div>

        {/* Panel de Progreso Visual - NUEVO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md flex flex-col items-center">
            <ProgressCircle 
              percentage={stats.correctPercentage} 
              label="Aciertos Totales"
              color="#10b981"
            />
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stats.totalQuestions} preguntas | {stats.totalAttempts} intentos
              </div>
            </div>
          </div>
          <StudyStreak />
          <div className="lg:col-span-1">
            <ActivityHeatmap />
          </div>
        </div>

        {/* Panel Admin - Solo para administradores */}
        { session.user?.role?.toLowerCase() === 'admin' && (
          <Link href="/admin" className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition mb-4">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-3 flex items-center justify-center gap-3">
              <div className="text-white text-3xl">⚙️</div>
              <h2 className="text-base font-bold text-white">Panel de Administrador</h2>
            </div>
          </Link>
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