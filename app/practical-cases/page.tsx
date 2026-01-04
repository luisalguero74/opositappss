'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Attempt {
  score: number
  correctAnswers: number
  totalQuestions: number
  completedAt: string
}

interface PracticalCase {
  id: string
  title: string
  theme: string | null
  statement: string | null
  _count: {
    questions: number
  }
  attempts?: Attempt[]
  bestScore?: number
  lastAttempt?: Attempt
}

export default function PracticalCases() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cases, setCases] = useState<PracticalCase[]>([])
  const [filteredCases, setFilteredCases] = useState<PracticalCase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [themes, setThemes] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadCases()
    }
  }, [status, router])

  const loadCases = async () => {
    try {
      const res = await fetch('/api/practical-cases')
      if (res.ok) {
        const data = await res.json()
        setCases(data.cases)
        setFilteredCases(data.cases)
        
        // Extract unique themes
        const uniqueThemes = Array.from(
          new Set(data.cases.map((c: PracticalCase) => c.theme).filter(Boolean))
        ) as string[]
        setThemes(uniqueThemes)
      }
    } catch (error) {
      console.error('Error loading cases:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTheme === 'all') {
      setFilteredCases(cases)
    } else {
      setFilteredCases(cases.filter(c => c.theme === selectedTheme))
    }
  }, [selectedTheme, cases])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando supuestos prácticos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">
            ← Volver al Panel
          </Link>
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-4xl font-bold text-white mb-2">Supuestos Prácticos</h1>
              <p className="text-orange-100">Practica con casos reales del examen</p>
            </div>
          </div>
        </div>

        {/* Filter by theme */}
        {themes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Filtrar por Tema</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTheme('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedTheme === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({cases.length})
              </button>
              {themes.map(theme => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedTheme === theme
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {theme} ({cases.filter(c => c.theme === theme).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cases list */}
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">
              {selectedTheme === 'all' 
                ? 'No hay supuestos prácticos disponibles'
                : 'No hay supuestos para este tema'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map(practicalCase => {
              const attemptsCount = practicalCase.attempts?.length || 0
              const bestScore = practicalCase.bestScore
              const lastAttempt = practicalCase.lastAttempt

              return (
                <div key={practicalCase.id} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {practicalCase.title}
                    </h3>
                    
                    {practicalCase.theme && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
                        {practicalCase.theme}
                      </span>
                    )}

                    {practicalCase.statement && (
                      <p className="text-gray-600 text-sm line-clamp-3 mt-2">
                        {practicalCase.statement}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-orange-600">
                          {practicalCase._count.questions}
                        </p>
                        <p className="text-gray-600 text-sm">Preguntas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {attemptsCount}
                        </p>
                        <p className="text-gray-600 text-sm">Intentos</p>
                      </div>
                    </div>

                    {bestScore !== undefined && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-center">
                          <span className="text-green-700 font-bold text-lg">
                            Mejor: {bestScore.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    )}

                    {lastAttempt && (
                      <div className="mt-2 text-center text-sm text-gray-500">
                        Último intento: {new Date(lastAttempt.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/practical-cases/${practicalCase.id}`}
                    className="block w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg text-center hover:from-orange-700 hover:to-red-700 transition"
                  >
                    {attemptsCount === 0 ? '🚀 Iniciar' : '🔄 Reintentar'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
