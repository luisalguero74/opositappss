'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ThemeStats {
  codigo: string
  numero: number
  titulo: string
  total: number
  correct: number
  percentage: number
  lastAttempt?: string
  trend?: 'up' | 'down' | 'stable'
}

export default function ThemeProgressPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [themes, setThemes] = useState<ThemeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'nombre' | 'progreso' | 'recent'>('progreso')
  const [filterLevel, setFilterLevel] = useState<'all' | 'weak' | 'medium' | 'strong'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchThemeProgress()
    }
  }, [status, router])

  const fetchThemeProgress = async () => {
    try {
      const res = await fetch('/api/user/analytics')
      if (res.ok) {
        const data = await res.json()
        if (data.byTema) {
          setThemes(data.byTema)
        }
      }
    } catch (error) {
      console.error('Error fetching theme progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 'Excelente', color: 'green', icon: '🌟' }
    if (percentage >= 60) return { level: 'Bueno', color: 'blue', icon: '👍' }
    if (percentage >= 40) return { level: 'Regular', color: 'yellow', icon: '⚠️' }
    return { level: 'Necesita mejorar', color: 'red', icon: '📚' }
  }

  const getRecommendation = (percentage: number, total: number) => {
    if (total === 0) return 'Aún no has practicado este tema. ¡Comienza ahora!'
    if (percentage >= 80) return '¡Excelente trabajo! Mantén este nivel con repasos periódicos.'
    if (percentage >= 60) return 'Buen progreso. Practica un poco más para dominar el tema.'
    if (percentage >= 40) return 'Necesitas más práctica. Dedica tiempo extra a este tema.'
    return 'Tema prioritario. Requiere atención urgente y práctica intensiva.'
  }

  const getSortedAndFilteredThemes = () => {
    let filtered = [...themes]

    // Filtrar por nivel
    if (filterLevel === 'weak') {
      filtered = filtered.filter(t => t.percentage < 60)
    } else if (filterLevel === 'medium') {
      filtered = filtered.filter(t => t.percentage >= 60 && t.percentage < 80)
    } else if (filterLevel === 'strong') {
      filtered = filtered.filter(t => t.percentage >= 80)
    }

    // Ordenar
    if (sortBy === 'nombre') {
      filtered.sort((a, b) => a.titulo.localeCompare(b.titulo))
    } else if (sortBy === 'progreso') {
      filtered.sort((a, b) => a.percentage - b.percentage) // Ascendente: peores primero
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => {
        if (!a.lastAttempt) return 1
        if (!b.lastAttempt) return -1
        return new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime()
      })
    }

    return filtered
  }

  const getOverallStats = () => {
    if (themes.length === 0) return { average: 0, weak: 0, strong: 0, total: 0 }
    
    const average = Math.round(themes.reduce((acc, t) => acc + t.percentage, 0) / themes.length)
    const weak = themes.filter(t => t.percentage < 60).length
    const strong = themes.filter(t => t.percentage >= 80).length
    const total = themes.length

    return { average, weak, strong, total }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando progreso por temas...</p>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()
  const sortedThemes = getSortedAndFilteredThemes()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">📈 Progreso por Tema</h1>
                <p className="text-purple-100">Análisis detallado de tu rendimiento en cada tema</p>
              </div>
              <div className="text-6xl">📚</div>
            </div>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Promedio Global</h3>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.average}%</p>
            <p className="text-sm text-gray-500 mt-2">en todos los temas</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Temas Dominados</h3>
              <span className="text-3xl">🌟</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.strong}</p>
            <p className="text-sm text-gray-500 mt-2">con más del 80%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Temas a Mejorar</h3>
              <span className="text-3xl">📚</span>
            </div>
            <p className="text-4xl font-bold text-red-600">{stats.weak}</p>
            <p className="text-sm text-gray-500 mt-2">con menos del 60%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Temas</h3>
              <span className="text-3xl">📖</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-2">en el temario</p>
          </div>
        </div>

        {/* Filtros y Ordenación */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="progreso">Progreso (peores primero)</option>
                <option value="nombre">Nombre del tema</option>
                <option value="recent">Más recientes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por nivel:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterLevel('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterLevel === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterLevel('weak')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterLevel === 'weak'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Débiles
                </button>
                <button
                  onClick={() => setFilterLevel('medium')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterLevel === 'medium'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Medios
                </button>
                <button
                  onClick={() => setFilterLevel('strong')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterLevel === 'strong'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fuertes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Temas */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Detalle por Tema</h2>
          
          {sortedThemes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg mb-4">
                {filterLevel !== 'all' 
                  ? 'No hay temas en esta categoría'
                  : 'Aún no has practicado ningún tema'
                }
              </p>
              {filterLevel !== 'all' && (
                <button
                  onClick={() => setFilterLevel('all')}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Ver todos los temas
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedThemes.map((theme) => {
                const performance = getPerformanceLevel(theme.percentage)
                const recommendation = getRecommendation(theme.percentage, theme.total)

                return (
                  <div 
                    key={theme.codigo} 
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{performance.icon}</span>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">
                              Tema {theme.numero}: {theme.titulo}
                            </h3>
                            <p className="text-sm text-gray-500">Código: {theme.codigo}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${
                          performance.color === 'green' ? 'bg-green-100 text-green-700' :
                          performance.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          performance.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {performance.level}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progreso</span>
                        <span className="font-bold text-gray-800">{theme.percentage}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            performance.color === 'green' ? 'bg-green-500' :
                            performance.color === 'blue' ? 'bg-blue-500' :
                            performance.color === 'yellow' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${theme.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Preguntas totales</p>
                        <p className="font-semibold text-gray-800">{theme.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Correctas</p>
                        <p className="font-semibold text-green-600">{theme.correct}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Incorrectas</p>
                        <p className="font-semibold text-red-600">{theme.total - theme.correct}</p>
                      </div>
                    </div>

                    {/* Recomendación */}
                    <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
                      <p className="text-sm font-semibold text-indigo-900 mb-1">💡 Recomendación:</p>
                      <p className="text-sm text-indigo-700">{recommendation}</p>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex gap-3">
                      <Link
                        href={`/dashboard/theory?tema=${theme.codigo}`}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition text-center"
                      >
                        Practicar Tema
                      </Link>
                      <Link
                        href={`/failed-questions?tema=${theme.codigo}`}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition text-center"
                      >
                        Ver Errores
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resumen y Consejos */}
        {sortedThemes.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">🎯 Plan de Acción Recomendado</h3>
            <div className="space-y-3">
              {stats.weak > 0 && (
                <p className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Prioriza los {stats.weak} temas débiles (menos del 60%) para mejorar tu base</span>
                </p>
              )}
              {stats.strong > 0 && (
                <p className="flex items-start gap-2">
                  <span>{stats.weak > 0 ? '2' : '1'}.</span>
                  <span>Mantén tus {stats.strong} temas fuertes con repasos periódicos</span>
                </p>
              )}
              <p className="flex items-start gap-2">
                <span>{stats.weak > 0 ? '3' : stats.strong > 0 ? '2' : '1'}.</span>
                <span>Dedica al menos 30 minutos diarios a cada tema débil</span>
              </p>
              <p className="flex items-start gap-2">
                <span>{stats.weak > 0 ? '4' : stats.strong > 0 ? '3' : '2'}.</span>
                <span>Revisa tus errores antes de practicar más preguntas del mismo tema</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
