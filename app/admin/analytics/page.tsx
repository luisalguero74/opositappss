'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from 'next-auth'

interface DashboardStats {
  users: {
    total: number
    activeToday: number
    activeWeek: number
    activeMonth: number
    newThisWeek: number
  }
  questions: {
    total: number
    byDifficulty: { easy: number; medium: number; hard: number }
    mostDifficult: Array<{ id: string; text: string; errorRate: number }>
    leastPracticed: Array<{ id: string; text: string; attempts: number }>
  }
  engagement: {
    avgSessionTime: number
    totalSessions: number
    questionsAnsweredToday: number
    completionRate: number
  }
  monetization: {
    kofiPatrons: number
    patreonPatrons: number
    adsImpressions: number
    adsClicks: number
    estimatedRevenue: number
  }
}

export default function AdminAnalytics() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week')

  useEffect(() => {
    if (session && session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    fetchStats()
  }, [timeRange])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/analytics?range=${timeRange}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl mb-3">📊</div>
                <h1 className="text-4xl font-bold text-white">Estadísticas Avanzadas</h1>
                <p className="text-blue-100 mt-2">Dashboard completo de métricas del sistema</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeRange('day')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    timeRange === 'day'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setTimeRange('week')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    timeRange === 'week'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    timeRange === 'month'
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  Mes
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Usuarios */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-3xl">👥</span> Usuarios
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-semibold">Total</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.users.total}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <p className="text-sm text-green-600 font-semibold">Hoy</p>
                  <p className="text-3xl font-bold text-green-900">{stats.users.activeToday}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <p className="text-sm text-purple-600 font-semibold">Esta semana</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.users.activeWeek}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <p className="text-sm text-orange-600 font-semibold">Este mes</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.users.activeMonth}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4">
                  <p className="text-sm text-pink-600 font-semibold">Nuevos (7d)</p>
                  <p className="text-3xl font-bold text-pink-900">{stats.users.newThisWeek}</p>
                </div>
              </div>
            </div>

            {/* Preguntas */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-3xl">❓</span> Preguntas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total de preguntas</p>
                  <p className="text-4xl font-bold text-gray-900 mb-4">{stats.questions.total}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fáciles</span>
                      <span className="font-bold text-green-600">{stats.questions.byDifficulty.easy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Medias</span>
                      <span className="font-bold text-yellow-600">{stats.questions.byDifficulty.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Difíciles</span>
                      <span className="font-bold text-red-600">{stats.questions.byDifficulty.hard}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">⚠️ Preguntas más difíciles</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.questions.mostDifficult.map((q) => (
                      <div key={q.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700 line-clamp-2">{q.text}</p>
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          {(q.errorRate * 100).toFixed(1)}% errores
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-3xl">🔥</span> Engagement
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4">
                  <p className="text-sm text-cyan-600 font-semibold">Tiempo promedio</p>
                  <p className="text-3xl font-bold text-cyan-900">{stats.engagement.avgSessionTime}m</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4">
                  <p className="text-sm text-teal-600 font-semibold">Sesiones totales</p>
                  <p className="text-3xl font-bold text-teal-900">{stats.engagement.totalSessions}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-emerald-600 font-semibold">Respuestas hoy</p>
                  <p className="text-3xl font-bold text-emerald-900">{stats.engagement.questionsAnsweredToday}</p>
                </div>
                <div className="bg-gradient-to-br from-lime-50 to-lime-100 rounded-xl p-4">
                  <p className="text-sm text-lime-600 font-semibold">Tasa completado</p>
                  <p className="text-3xl font-bold text-lime-900">{stats.engagement.completionRate}%</p>
                </div>
              </div>
            </div>

            {/* Monetización */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-3xl">💰</span> Monetización
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-green-600 font-semibold">Ko-fi</p>
                  <p className="text-3xl font-bold text-green-900">{stats.monetization.kofiPatrons}</p>
                  <p className="text-xs text-gray-500">patrons</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-xl p-4">
                  <p className="text-sm text-orange-600 font-semibold">Patreon</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.monetization.patreonPatrons}</p>
                  <p className="text-xs text-gray-500">patrons</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-semibold">Impresiones</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.monetization.adsImpressions}</p>
                  <p className="text-xs text-gray-500">ads</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-4">
                  <p className="text-sm text-purple-600 font-semibold">Clicks</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.monetization.adsClicks}</p>
                  <p className="text-xs text-gray-500">ads</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-4">
                  <p className="text-sm text-yellow-700 font-semibold">Ingresos (est.)</p>
                  <p className="text-3xl font-bold text-yellow-900">€{stats.monetization.estimatedRevenue}</p>
                  <p className="text-xs text-gray-500">30 días</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600">No hay datos disponibles</p>
          </div>
        )}
      </div>
    </div>
  )
}
