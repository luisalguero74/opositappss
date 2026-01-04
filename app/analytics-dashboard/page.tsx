'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AnalyticsData {
  general: {
    totalAttempts: number
    totalQuestions: number
    totalCorrect: number
    averageScore: number
    totalIncorrect: number
  }
  streak: {
    current: number
    longest: number
    totalDays: number
  }
  byTema: Array<{
    codigo: string
    numero: number
    titulo: string
    total: number
    correct: number
    percentage: number
  }>
  failedQuestions: Array<{
    questionId: string
    count: number
    question?: {
      id: string
      text: string
      temaCodigo?: string
      temaNumero?: number
      temaTitulo?: string
    }
  }>
  recentAttempts: Array<{
    id: string
    title: string
    type: string
    score: number
    correctAnswers: number
    totalQuestions: number
    completedAt: string
  }>
  chartData: Array<{
    date: string
    total: number
    correct: number
    percentage: number
  }>
}

export default function AnalyticsDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAnalytics()
    }
  }, [status, router])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/user/analytics')
      if (res.ok) {
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setAnalytics(data)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError('Error de conexión. Verifica tu internet.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {error ? 'Error al cargar estadísticas' : 'Aún no tienes estadísticas'}
            </h2>
            <p className="text-gray-600 mb-8">
              {error 
                ? 'Ocurrió un error al cargar tus datos. Por favor, intenta de nuevo.'
                : 'Comienza a hacer cuestionarios para ver tus estadísticas aquí.'
              }
            </p>
            {error ? (
              <button
                onClick={() => {
                  setError('')
                  setLoading(true)
                  fetchAnalytics()
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Reintentar
              </button>
            ) : (
              <Link 
                href="/dashboard/theory" 
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Ir a Cuestionarios
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { general, streak, byTema, failedQuestions, recentAttempts, chartData } = analytics

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">📊 Mis Estadísticas</h1>
                <p className="text-blue-100">Análisis completo de tu progreso</p>
              </div>
              <div className="text-6xl">📈</div>
            </div>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Precisión Global</h3>
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{general.averageScore}%</p>
            <p className="text-sm text-gray-500 mt-2">
              {general.totalCorrect} / {general.totalQuestions} correctas
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Racha Actual</h3>
              <span className="text-3xl">🔥</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{streak.current}</p>
            <p className="text-sm text-gray-500 mt-2">
              días consecutivos (récord: {streak.longest})
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Cuestionarios</h3>
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{general.totalAttempts}</p>
            <p className="text-sm text-gray-500 mt-2">completados</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Preguntas</h3>
              <span className="text-3xl">💯</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">{general.totalQuestions}</p>
            <p className="text-sm text-gray-500 mt-2">respondidas</p>
          </div>
        </div>

        {/* Gráfico de progreso últimos 30 días */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📈 Progreso Últimos 30 Días
          </h2>
          {chartData && chartData.length > 0 && chartData.some(d => d.total > 0) ? (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-2 h-64 min-w-max">
                {chartData.map((day, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="relative w-12 h-full flex flex-col justify-end">
                      <div
                        className="bg-gradient-to-t from-green-400 to-green-600 rounded-t"
                        style={{ height: `${Math.max(day.percentage, 5)}%` }}
                        title={`${day.percentage}% correctas (${day.correct}/${day.total})`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 transform -rotate-45 origin-top-left mt-8">
                      {new Date(day.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-500 text-lg">
                Comienza a responder preguntas para ver tu progreso
              </p>
              <p className="text-gray-400 text-sm mt-2">
                El gráfico se actualizará con tus respuestas diarias
              </p>
            </div>
          )}
        </div>

        {/* Estadísticas por tema */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            📚 Rendimiento por Tema
          </h2>
          {byTema.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aún no has respondido preguntas de temas específicos
            </p>
          ) : (
            <div className="space-y-4">
              {byTema.slice(0, 10).map((tema) => (
                <div key={tema.codigo} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Tema {tema.numero}: {tema.titulo}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tema.correct} / {tema.total} preguntas correctas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${
                        tema.percentage >= 80 ? 'text-green-600' :
                        tema.percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {tema.percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        tema.percentage >= 80 ? 'bg-green-500' :
                        tema.percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${tema.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preguntas más falladas */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            ❌ Preguntas Más Falladas
          </h2>
          {failedQuestions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              ¡Excelente! No has fallado ninguna pregunta aún
            </p>
          ) : (
            <div className="space-y-3">
              {failedQuestions.slice(0, 5).map((item, index) => (
                item.question && (
                  <div key={item.questionId} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {item.count}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">
                          {item.question.temaTitulo ? `Tema ${item.question.temaNumero}: ${item.question.temaTitulo}` : 'Sin tema'}
                        </p>
                        <p className="text-gray-800 line-clamp-2">{item.question.text}</p>
                        <p className="text-xs text-red-600 mt-2">
                          Fallada {item.count} {item.count === 1 ? 'vez' : 'veces'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Intentos recientes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            🕐 Actividad Reciente
          </h2>
          {recentAttempts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No has completado ningún cuestionario aún
            </p>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{attempt.title}</h3>
                      <p className="text-sm text-gray-600">
                        {attempt.correctAnswers} / {attempt.totalQuestions} correctas ({attempt.score}%)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(attempt.completedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ${
                      attempt.score >= 80 ? 'text-green-600' :
                      attempt.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {attempt.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
