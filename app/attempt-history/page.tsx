'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AttemptRecord {
  id: string
  title: string
  type: string
  score: number
  correctAnswers: number
  totalQuestions: number
  completedAt: string
  timeSpent?: number
  questionnaire?: {
    id: string
    title: string
    type: string
  }
}

export default function AttemptHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'theory' | 'practical' | 'exam'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'questions'>('recent')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAttempts()
    }
  }, [status, router])

  const fetchAttempts = async () => {
    try {
      const res = await fetch('/api/user/analytics')
      if (res.ok) {
        const data = await res.json()
        if (data.recentAttempts) {
          setAttempts(data.recentAttempts)
        }
      }
    } catch (error) {
      console.error('Error fetching attempts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAndSortedAttempts = () => {
    let filtered = [...attempts]

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type.toLowerCase() === filterType)
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ordenar
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => b.score - a.score)
    } else if (sortBy === 'questions') {
      filtered.sort((a, b) => b.totalQuestions - a.totalQuestions)
    }

    return filtered
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'theory': return '📚'
      case 'practical': return '💼'
      case 'exam': return '📝'
      default: return '📖'
    }
  }

  const getTypeName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'theory': return 'Teórico'
      case 'practical': return 'Práctico'
      case 'exam': return 'Simulacro'
      default: return 'Cuestionario'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getOverallStats = () => {
    const total = attempts.length
    const avgScore = total > 0 
      ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / total)
      : 0
    const totalQuestions = attempts.reduce((acc, a) => acc + a.totalQuestions, 0)
    const totalCorrect = attempts.reduce((acc, a) => acc + a.correctAnswers, 0)

    return { total, avgScore, totalQuestions, totalCorrect }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()
  const filteredAttempts = getFilteredAndSortedAttempts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-slate-700 to-blue-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">📜 Historial de Intentos</h1>
                <p className="text-blue-100">Todos tus cuestionarios y exámenes completados</p>
              </div>
              <div className="text-6xl">📊</div>
            </div>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Intentos</h3>
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-2">completados</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Promedio</h3>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.avgScore}%</p>
            <p className="text-sm text-gray-500 mt-2">puntuación media</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Preguntas</h3>
              <span className="text-3xl">❓</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.totalQuestions}</p>
            <p className="text-sm text-gray-500 mt-2">respondidas en total</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Correctas</h3>
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">{stats.totalCorrect}</p>
            <p className="text-sm text-gray-500 mt-2">acertadas</p>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Título del cuestionario..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('theory')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'theory'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Teóricos
                </button>
                <button
                  onClick={() => setFilterType('exam')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'exam'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Exámenes
                </button>
              </div>
            </div>

            {/* Ordenar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent">Más recientes</option>
                <option value="score">Mejor puntuación</option>
                <option value="questions">Más preguntas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Intentos */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📋 Intentos Registrados</h2>
            <span className="text-gray-600">{filteredAttempts.length} resultados</span>
          </div>
          
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg mb-4">
                {searchTerm || filterType !== 'all'
                  ? 'No se encontraron resultados con estos filtros'
                  : 'Aún no has completado ningún cuestionario'
                }
              </p>
              {(searchTerm || filterType !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterType('all')
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link
                  href="/dashboard/theory"
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Comenzar a Practicar
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAttempts.map((attempt, index) => (
                <div 
                  key={attempt.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-4xl">{getTypeIcon(attempt.type)}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">{attempt.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{formatDate(attempt.completedAt)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>📂</span>
                            <span>{getTypeName(attempt.type)}</span>
                          </span>
                          {attempt.timeSpent && (
                            <span className="flex items-center gap-1">
                              <span>⏱️</span>
                              <span>{formatDuration(attempt.timeSpent)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColor(attempt.score)}`}>
                        {attempt.score}%
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {attempt.correctAnswers} / {attempt.totalQuestions} correctas
                      </p>
                    </div>
                  </div>

                  {/* Barra de progreso visual */}
                  <div className="mt-4">
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          attempt.score >= 80 ? 'bg-green-500' :
                          attempt.score >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${attempt.score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Análisis rápido */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Correctas</p>
                        <p className="text-lg font-bold text-green-600">{attempt.correctAnswers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Falladas</p>
                        <p className="text-lg font-bold text-red-600">
                          {attempt.totalQuestions - attempt.correctAnswers}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Precisión</p>
                        <p className="text-lg font-bold text-blue-600">{attempt.score}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de evolución (placeholder) */}
        {filteredAttempts.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-3">📈 Análisis de Evolución</h3>
            <p className="text-indigo-100 mb-4">
              Continúa practicando para ver tu evolución a lo largo del tiempo
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-indigo-200 mb-1">Mejor Resultado</p>
                <p className="text-2xl font-bold">
                  {Math.max(...filteredAttempts.map(a => a.score))}%
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-indigo-200 mb-1">Promedio General</p>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-indigo-200 mb-1">Total Completados</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
