'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface StudySession {
  id: string
  startedAt: string
  duration: number
  questionsAnswered: number
  correctAnswers: number
  type: string
  topics: string[]
}

export default function StudySessionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    totalQuestions: 0,
    averageAccuracy: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchSessions()
    }
  }, [status, router])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/user/study-sessions')
      if (res.ok) {
        const data = await res.json()
        if (data.sessions) {
          setSessions(data.sessions)
          calculateStats(data.sessions)
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (sessions: StudySession[]) => {
    const totalSessions = sessions.length
    const totalTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0)
    const totalQuestions = sessions.reduce((acc, s) => acc + (s.questionsAnswered || 0), 0)
    const totalCorrect = sessions.reduce((acc, s) => acc + (s.correctAnswers || 0), 0)
    const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    setStats({
      totalSessions,
      totalTime,
      totalQuestions,
      averageAccuracy
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sesiones...</p>
        </div>
      </div>
    )
  }

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
                <h1 className="text-4xl font-bold text-white mb-2">🕒 Sesiones de Estudio</h1>
                <p className="text-blue-100">Historial completo de tus sesiones de práctica</p>
              </div>
              <div className="text-6xl">📚</div>
            </div>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Sesiones</h3>
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.totalSessions}</p>
            <p className="text-sm text-gray-500 mt-2">sesiones completadas</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Tiempo Total</h3>
              <span className="text-3xl">⏱️</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{formatDuration(stats.totalTime)}</p>
            <p className="text-sm text-gray-500 mt-2">de estudio acumulado</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Preguntas</h3>
              <span className="text-3xl">❓</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.totalQuestions}</p>
            <p className="text-sm text-gray-500 mt-2">respondidas en total</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Precisión</h3>
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">{stats.averageAccuracy}%</p>
            <p className="text-sm text-gray-500 mt-2">precisión promedio</p>
          </div>
        </div>

        {/* Lista de Sesiones */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Historial de Sesiones</h2>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg mb-4">Aún no has completado ninguna sesión de estudio</p>
              <Link 
                href="/dashboard/theory"
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Comenzar a Estudiar
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, index) => {
                const accuracy = session.questionsAnswered > 0 
                  ? Math.round((session.correctAnswers / session.questionsAnswered) * 100)
                  : 0

                return (
                  <div 
                    key={session.id} 
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                          {sessions.length - index}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {session.type === 'theory' ? '📚 Cuestionario Teórico' : 
                             session.type === 'practical' ? '💼 Supuesto Práctico' :
                             session.type === 'exam' ? '📝 Simulacro de Examen' :
                             '🎯 Sesión de Estudio'}
                          </h3>
                          <p className="text-sm text-gray-500">{formatDate(session.startedAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Duración</p>
                            <p className="font-semibold text-gray-800">{formatDuration(session.duration)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Preguntas</p>
                            <p className="font-semibold text-gray-800">{session.questionsAnswered}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Precisión</p>
                            <p className={`font-bold text-lg ${
                              accuracy >= 80 ? 'text-green-600' :
                              accuracy >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {accuracy}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {session.topics && session.topics.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-2">Temas estudiados:</p>
                        <div className="flex flex-wrap gap-2">
                          {session.topics.map((topic, i) => (
                            <span 
                              key={i}
                              className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Consejos */}
        {sessions.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-3">💡 Consejos para mejorar</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Mantén sesiones de estudio regulares para mejorar la retención</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Las sesiones de 25-45 minutos son más efectivas que estudios muy largos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Revisa tus preguntas falladas después de cada sesión</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
