'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GlobalStats {
  totalUsers: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  successRate: number
  byType: {
    theory: { total: number; correct: number; successRate: number }
    practical: { total: number; correct: number; successRate: number }
  }
}

interface UserStats {
  userId: string
  email: string
  memberSince: string
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  successRate: number
  theoryTotal: number
  theoryCorrect: number
  practicalTotal: number
  practicalCorrect: number
}

interface UserDetail {
  user: { id: string; email: string; memberSince: string }
  general: {
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
    successRate: number
  }
  byType: {
    theory: { total: number; correct: number; incorrect: number; successRate: number }
    practical: { total: number; correct: number; incorrect: number; successRate: number }
  }
  repeatedErrors: Array<{
    questionText: string
    questionnaireTitle: string
    attempts: number
    errors: number
    correctAnswer: string
  }>
  recentErrors: Array<{
    questionText: string
    questionnaireTitle: string
    userAnswer: string
    correctAnswer: string
    date: string
  }>
}

export default function AdminStatistics() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'global' | 'users'>('global')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadGlobalStats()
  }, [])

  const loadGlobalStats = async () => {
    try {
      const res = await fetch('/api/admin/statistics')
      if (res.ok) {
        const data = await res.json()
        setGlobalStats(data.global)
        setUserStats(data.users)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/statistics?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUser(data)
      }
    } catch (error) {
      console.error('Error loading user detail:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-xl text-gray-700">Cargando estadísticas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-800">📊 Estadísticas del Sistema</h1>
          <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold">← Panel Admin</Link>
        </div>

        {/* Pestañas */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="flex border-b">
            <button
              onClick={() => { setActiveTab('global'); setSelectedUser(null) }}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'global'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌍 Estadísticas Globales
            </button>
            <button
              onClick={() => { setActiveTab('users'); setSelectedUser(null) }}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Estadísticas por Usuario
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'global' && globalStats && (
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Resumen Global del Sistema</h2>
                
                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="text-5xl mb-2">👥</div>
                    <div className="text-4xl font-bold">{globalStats.totalUsers}</div>
                    <div className="text-blue-100">Usuarios totales</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="text-5xl mb-2">📝</div>
                    <div className="text-4xl font-bold">{globalStats.totalQuestions}</div>
                    <div className="text-purple-100">Preguntas respondidas</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="text-5xl mb-2">✅</div>
                    <div className="text-4xl font-bold">{globalStats.correctAnswers}</div>
                    <div className="text-green-100">Respuestas correctas</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
                    <div className="text-5xl mb-2">🎯</div>
                    <div className="text-4xl font-bold">{globalStats.successRate}%</div>
                    <div className="text-orange-100">Tasa global de acierto</div>
                  </div>
                </div>

                {/* Estadísticas por tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
                    <h3 className="text-2xl font-bold text-blue-700 mb-4">📘 Cuestionarios de Teoría</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total respondidas:</span>
                        <span className="font-bold">{globalStats.byType.theory.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Correctas:</span>
                        <span className="font-bold text-green-600">{globalStats.byType.theory.correct}</span>
                      </div>
                      <div className="flex justify-between border-t-2 border-blue-300 pt-3">
                        <span className="text-gray-700 font-semibold">Tasa de acierto:</span>
                        <span className="font-bold text-2xl text-blue-700">{globalStats.byType.theory.successRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-green-300 rounded-xl p-6 bg-green-50">
                    <h3 className="text-2xl font-bold text-green-700 mb-4">📗 Supuestos Prácticos</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total respondidas:</span>
                        <span className="font-bold">{globalStats.byType.practical.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Correctas:</span>
                        <span className="font-bold text-green-600">{globalStats.byType.practical.correct}</span>
                      </div>
                      <div className="flex justify-between border-t-2 border-green-300 pt-3">
                        <span className="text-gray-700 font-semibold">Tasa de acierto:</span>
                        <span className="font-bold text-2xl text-green-700">{globalStats.byType.practical.successRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && !selectedUser && (
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Estadísticas por Usuario</h2>
                
                {userStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-xl">No hay datos de usuarios aún</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-700 font-semibold">Usuario</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Preguntas</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Aciertos</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Errores</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">% Acierto</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Teoría</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Prácticos</th>
                          <th className="px-4 py-3 text-center text-gray-700 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.map((user, idx) => (
                          <tr key={user.userId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-gray-800">{user.email}</td>
                            <td className="px-4 py-3 text-center font-semibold">{user.totalQuestions}</td>
                            <td className="px-4 py-3 text-center text-green-600 font-semibold">{user.correctAnswers}</td>
                            <td className="px-4 py-3 text-center text-red-600 font-semibold">{user.incorrectAnswers}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full font-bold ${
                                user.successRate >= 75 ? 'bg-green-100 text-green-700' :
                                user.successRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {user.successRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {user.theoryCorrect}/{user.theoryTotal}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {user.practicalCorrect}/{user.practicalTotal}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => loadUserDetail(user.userId)}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition text-sm"
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {selectedUser && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">Detalle de {selectedUser.user.email}</h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    ← Volver a la lista
                  </button>
                </div>

                {/* Resumen del usuario */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-xl shadow p-4">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-indigo-600">{selectedUser.general.totalQuestions}</div>
                    <div className="text-sm text-gray-600">Preguntas</div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-green-600">{selectedUser.general.correctAnswers}</div>
                    <div className="text-sm text-gray-600">Correctas</div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <div className="text-3xl mb-2">❌</div>
                    <div className="text-2xl font-bold text-red-600">{selectedUser.general.incorrectAnswers}</div>
                    <div className="text-sm text-gray-600">Incorrectas</div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-4">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold text-purple-600">{selectedUser.general.successRate}%</div>
                    <div className="text-sm text-gray-600">Tasa acierto</div>
                  </div>
                </div>

                {/* Errores repetidos */}
                <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">🔄 Errores Repetidos ({selectedUser.repeatedErrors.length})</h3>
                  {selectedUser.repeatedErrors.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No tiene errores repetidos</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedUser.repeatedErrors.slice(0, 10).map((error, idx) => (
                        <div key={idx} className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800">{error.questionText}</div>
                              <div className="text-sm text-gray-600">{error.questionnaireTitle}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-orange-600">{error.errors}/{error.attempts}</div>
                              <div className="text-xs text-gray-600">errores</div>
                            </div>
                          </div>
                          <div className="text-sm text-green-700 bg-green-100 rounded p-2">
                            <strong>Correcta:</strong> {error.correctAnswer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Errores recientes */}
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">❌ Errores Recientes</h3>
                  {selectedUser.recentErrors.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No tiene errores recientes</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedUser.recentErrors.slice(0, 5).map((error, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">
                            {error.questionnaireTitle} - {new Date(error.date).toLocaleDateString('es-ES')}
                          </div>
                          <div className="font-semibold text-gray-800 mb-2">{error.questionText}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50 rounded p-2">
                              <div className="text-xs text-red-700 font-semibold">Su respuesta:</div>
                              <div className="text-sm text-red-900">{error.userAnswer}</div>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <div className="text-xs text-green-700 font-semibold">Correcta:</div>
                              <div className="text-sm text-green-900">{error.correctAnswer}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
