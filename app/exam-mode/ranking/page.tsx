'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RankingEntry {
  rank: number
  userId: string
  userName: string
  email: string
  totalScore: number
  testScore: number
  practicalScore: number
  statistics: {
    test: {
      correct: number
      incorrect: number
      blank: number
    }
    practical: {
      correct: number
      incorrect: number
      blank: number
    }
  }
  examTitle: string
  completedAt: string
}

export default function ExamRankingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchRanking()
    }
  }, [status, router, page])

  const fetchRanking = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exam-official/ranking?page=${page}&limit=50`)
      if (!res.ok) {
        throw new Error('Error al cargar ranking')
      }
      const data = await res.json()
      setRankings(data.rankings)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('[Ranking] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && rankings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Ranking Global de Exámenes
            </h1>
            <p className="text-gray-600">
              Clasificación de todos los participantes por puntuación total
            </p>
          </div>

          {rankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                Todavía no hay participantes en el ranking.
              </p>
              <Link
                href="/exam-mode"
                className="inline-block mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
              >
                Ser el primero →
              </Link>
            </div>
          ) : (
            <>
              {/* Podio Top 3 */}
              {rankings.slice(0, 3).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {rankings[1] && (
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 text-center border-2 border-gray-300 order-2 md:order-1">
                      <div className="text-5xl mb-2">🥈</div>
                      <div className="text-2xl font-bold text-gray-700">#{rankings[1].rank}</div>
                      <h3 className="font-bold text-lg text-gray-800 mt-2 truncate">
                        {rankings[1].userName}
                      </h3>
                      <p className="text-3xl font-bold text-gray-700 mt-2">
                        {rankings[1].totalScore.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">puntos</p>
                    </div>
                  )}

                  {rankings[0] && (
                    <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-6 text-center border-4 border-yellow-400 order-1 md:order-2 transform md:scale-110">
                      <div className="text-6xl mb-2">🥇</div>
                      <div className="text-2xl font-bold text-yellow-700">#{rankings[0].rank}</div>
                      <h3 className="font-bold text-xl text-yellow-900 mt-2 truncate">
                        {rankings[0].userName}
                      </h3>
                      <p className="text-4xl font-bold text-yellow-800 mt-2">
                        {rankings[0].totalScore.toFixed(2)}
                      </p>
                      <p className="text-sm text-yellow-700">puntos</p>
                    </div>
                  )}

                  {rankings[2] && (
                    <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-6 text-center border-2 border-orange-300 order-3">
                      <div className="text-5xl mb-2">🥉</div>
                      <div className="text-2xl font-bold text-orange-700">#{rankings[2].rank}</div>
                      <h3 className="font-bold text-lg text-orange-800 mt-2 truncate">
                        {rankings[2].userName}
                      </h3>
                      <p className="text-3xl font-bold text-orange-700 mt-2">
                        {rankings[2].totalScore.toFixed(2)}
                      </p>
                      <p className="text-sm text-orange-600">puntos</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tabla completa */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Posición</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Usuario</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Puntuación</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Parte 1</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Parte 2</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rankings.map((entry) => {
                      const isCurrentUser = session?.user?.email === entry.email
                      return (
                        <tr 
                          key={entry.userId + entry.rank} 
                          className={`hover:bg-gray-50 ${isCurrentUser ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                              entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                              entry.rank === 2 ? 'bg-gray-100 text-gray-700' :
                              entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-800">
                                {entry.userName}
                                {isCurrentUser && <span className="ml-2 text-blue-600">(Tú)</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg font-bold text-gray-800">
                              {entry.totalScore.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {entry.testScore.toFixed(2)}/50
                            <div className="text-xs text-gray-500">
                              {entry.statistics.test.correct}✓ {entry.statistics.test.incorrect}✗
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {entry.practicalScore.toFixed(2)}/50
                            <div className="text-xs text-gray-500">
                              {entry.statistics.practical.correct}✓ {entry.statistics.practical.incorrect}✗
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {new Date(entry.completedAt).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
