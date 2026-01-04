'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Statistics {
  general: {
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
    successRate: number
  }
  byType: {
    theory: {
      total: number
      correct: number
      incorrect: number
      successRate: number
    }
    practical: {
      total: number
      correct: number
      incorrect: number
      successRate: number
    }
  }
  repeatedErrors: Array<{
    questionId: string
    questionText: string
    questionnaireTitle: string
    questionnaireType: string
    attempts: number
    errors: number
    correctAnswer: string
    explanation: string
  }>
  recentErrors: Array<{
    questionId: string
    questionText: string
    questionnaireTitle: string
    questionnaireType: string
    userAnswer: string
    correctAnswer: string
    explanation: string
    date: string
  }>
  studyRecommendations: {
    failedQuestions: Array<{
      questionText: string
      questionnaireTitle: string
      correctAnswer: string
      legalArticle: string
      errors: number
    }>
    themesToReview: Array<{
      themeName: string
      errorCount: number
      totalQuestions: number
      errorRate: number
      recommendation: string
    }>
  }
}

export default function StatisticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'errors' | 'repeated' | 'recommendations'>('general')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/statistics')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl text-gray-700">Cargando estadísticas...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl text-gray-700">No se pudieron cargar las estadísticas</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-800">📊 Estadísticas de Aprendizaje</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold">← Dashboard</Link>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-5xl mb-2">📝</div>
            <div className="text-3xl font-bold text-indigo-600">{stats.general.totalQuestions}</div>
            <div className="text-gray-600">Preguntas realizadas</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-5xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600">{stats.general.correctAnswers}</div>
            <div className="text-gray-600">Respuestas correctas</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-5xl mb-2">❌</div>
            <div className="text-3xl font-bold text-red-600">{stats.general.incorrectAnswers}</div>
            <div className="text-gray-600">Respuestas incorrectas</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-5xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-purple-600">{stats.general.successRate}%</div>
            <div className="text-gray-600">Tasa de acierto</div>
          </div>
        </div>

        {/* Estadísticas por Tipo */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 Estadísticas por Tipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teoría */}
            <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
              <h3 className="text-xl font-bold text-blue-700 mb-4">📘 Cuestionarios de Teoría</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total de preguntas:</span>
                  <span className="font-bold">{stats.byType.theory.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Correctas:</span>
                  <span className="font-bold text-green-600">{stats.byType.theory.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Incorrectas:</span>
                  <span className="font-bold text-red-600">{stats.byType.theory.incorrect}</span>
                </div>
                <div className="flex justify-between border-t-2 border-blue-300 pt-3">
                  <span className="text-gray-700 font-semibold">Tasa de acierto:</span>
                  <span className="font-bold text-xl text-blue-700">{stats.byType.theory.successRate}%</span>
                </div>
              </div>
            </div>

            {/* Prácticos */}
            <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
              <h3 className="text-xl font-bold text-green-700 mb-4">📗 Supuestos Prácticos</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total de preguntas:</span>
                  <span className="font-bold">{stats.byType.practical.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Correctas:</span>
                  <span className="font-bold text-green-600">{stats.byType.practical.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Incorrectas:</span>
                  <span className="font-bold text-red-600">{stats.byType.practical.incorrect}</span>
                </div>
                <div className="flex justify-between border-t-2 border-green-300 pt-3">
                  <span className="text-gray-700 font-semibold">Tasa de acierto:</span>
                  <span className="font-bold text-xl text-green-700">{stats.byType.practical.successRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Vista General
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'errors'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ Fallos Recientes
            </button>
            <button
              onClick={() => setActiveTab('repeated')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'repeated'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔄 Errores Repetidos
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'recommendations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📚 Recomendaciones
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'general' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Resumen de tu progreso</h3>
                <p className="text-gray-600 mb-6">
                  Has completado <strong>{stats.general.totalQuestions}</strong> preguntas en total, 
                  con una tasa de acierto del <strong>{stats.general.successRate}%</strong>.
                </p>
                {stats.general.totalQuestions === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-xl">Aún no has realizado ningún cuestionario</p>
                    <p className="mt-2">¡Empieza a practicar para ver tus estadísticas!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">Progreso general</span>
                        <span className="text-sm text-gray-500">{stats.general.successRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 h-4 rounded-full transition-all"
                          style={{ width: `${stats.general.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'errors' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">❌ Tus fallos recientes</h3>
                <p className="text-gray-600 mb-6">
                  Revisa las preguntas que has fallado recientemente para mejorar tu aprendizaje.
                </p>
                {stats.recentErrors.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-xl">¡No has cometido errores o aún no has realizado cuestionarios!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentErrors.map((error, idx) => (
                      <div key={idx} className="border-2 border-red-200 rounded-xl p-6 bg-red-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">
                              {error.questionnaireType === 'theory' ? '📘 Teoría' : '📗 Práctico'} - {error.questionnaireTitle}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(error.date).toLocaleDateString('es-ES', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 mb-3">
                          <div className="font-semibold text-gray-800 mb-2">Pregunta:</div>
                          <div className="text-gray-700">{error.questionText}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-red-100 rounded-lg p-3">
                            <div className="text-sm font-semibold text-red-700 mb-1">Tu respuesta:</div>
                            <div className="text-red-900">{error.userAnswer}</div>
                          </div>
                          <div className="bg-green-100 rounded-lg p-3">
                            <div className="text-sm font-semibold text-green-700 mb-1">Respuesta correcta:</div>
                            <div className="text-green-900">{error.correctAnswer}</div>
                          </div>
                        </div>
                        {error.explanation && (
                          <div className="mt-3 bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                            <div className="text-sm font-semibold text-blue-700 mb-1">💡 Explicación:</div>
                            <div className="text-blue-900 text-sm">{error.explanation}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'repeated' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">🔄 Errores que repites</h3>
                <p className="text-gray-600 mb-6">
                  Estas preguntas requieren más atención. Te recomendamos repasarlas con cuidado.
                </p>
                {stats.repeatedErrors.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-xl">¡No tienes errores repetidos!</p>
                    <p className="mt-2">Sigue practicando para mantener tu buen rendimiento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.repeatedErrors.map((error, idx) => (
                      <div key={idx} className="border-2 border-orange-200 rounded-xl p-6 bg-orange-50">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-gray-600">
                              {error.questionnaireType === 'theory' ? '📘 Teoría' : '📗 Práctico'} - {error.questionnaireTitle}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-600">{error.errors}/{error.attempts}</div>
                            <div className="text-xs text-gray-600">errores/intentos</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 mb-3">
                          <div className="font-semibold text-gray-800 mb-2">Pregunta:</div>
                          <div className="text-gray-700">{error.questionText}</div>
                        </div>
                        <div className="bg-green-100 rounded-lg p-3 mb-3">
                          <div className="text-sm font-semibold text-green-700 mb-1">✓ Respuesta correcta:</div>
                          <div className="text-green-900">{error.correctAnswer}</div>
                        </div>
                        {error.explanation && (
                          <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                            <div className="text-sm font-semibold text-blue-700 mb-1">💡 Explicación:</div>
                            <div className="text-blue-900 text-sm">{error.explanation}</div>
                          </div>
                        )}
                        {error.errors > 2 && (
                          <div className="mt-3 bg-red-100 rounded-lg p-3 text-center">
                            <span className="text-red-700 font-semibold">⚠️ Atención especial requerida - Has fallado esta pregunta {error.errors} veces</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📚 Recomendaciones de Estudio</h3>
                <p className="text-gray-600 mb-6">
                  Basadas en tus errores, aquí tienes recomendaciones personalizadas para mejorar tu preparación.
                </p>

                {stats.studyRecommendations.failedQuestions.length === 0 && stats.studyRecommendations.themesToReview.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">🎓</div>
                    <p className="text-xl">¡Aún no hay recomendaciones!</p>
                    <p className="mt-2">Completa algunos cuestionarios para recibir sugerencias personalizadas</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Temas a repasar */}
                    {stats.studyRecommendations.themesToReview.length > 0 && (
                      <div>
                        <h4 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Temas que necesitan atención urgente</span>
                        </h4>
                        <div className="space-y-4">
                          {stats.studyRecommendations.themesToReview.map((theme, idx) => (
                            <div key={idx} className="border-2 border-red-300 rounded-xl p-6 bg-gradient-to-r from-red-50 to-orange-50">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h5 className="text-lg font-bold text-gray-800 mb-2">{theme.themeName}</h5>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-red-600 font-semibold">
                                      {theme.errorCount} errores de {theme.totalQuestions} preguntas
                                    </span>
                                    <span className="text-orange-600 font-semibold">
                                      Tasa de error: {theme.errorRate}%
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-3xl font-bold text-red-600">{theme.errorRate}%</div>
                                  <div className="text-xs text-gray-600">errores</div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                                <div
                                  className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full"
                                  style={{ width: `${theme.errorRate}%` }}
                                ></div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                <div className="text-sm font-semibold text-blue-700 mb-2">💡 Recomendación:</div>
                                <div className="text-gray-800">{theme.recommendation}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preguntas falladas con artículos legales */}
                    {stats.studyRecommendations.failedQuestions.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                          <span>📖</span>
                          <span>Fundamento legal de tus errores</span>
                        </h4>
                        <p className="text-gray-600 mb-4 text-sm">
                          Revisa los artículos legales donde encontrarás la respuesta correcta a cada pregunta fallada.
                        </p>
                        <div className="space-y-4">
                          {stats.studyRecommendations.failedQuestions.map((question, idx) => (
                            <div key={idx} className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                              <div className="flex items-start justify-between mb-3">
                                <div className="text-sm text-gray-600">
                                  📘 {question.questionnaireTitle}
                                </div>
                                {question.errors > 1 && (
                                  <div className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                                    Fallada {question.errors} {question.errors === 1 ? 'vez' : 'veces'}
                                  </div>
                                )}
                              </div>
                              <div className="bg-white rounded-lg p-4 mb-4">
                                <div className="font-semibold text-gray-800 mb-2">❓ Pregunta:</div>
                                <div className="text-gray-700">{question.questionText}</div>
                              </div>
                              <div className="bg-green-100 rounded-lg p-4 mb-4">
                                <div className="text-sm font-semibold text-green-700 mb-2">✅ Respuesta correcta:</div>
                                <div className="text-green-900 font-medium">{question.correctAnswer}</div>
                              </div>
                              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border-l-4 border-amber-500">
                                <div className="flex items-start gap-3">
                                  <div className="text-2xl">⚖️</div>
                                  <div className="flex-1">
                                    <div className="text-sm font-bold text-amber-800 mb-2">Fundamento legal:</div>
                                    <div className="text-amber-900 font-medium">{question.legalArticle}</div>
                                    <div className="mt-3 text-xs text-amber-700 bg-white/50 rounded p-2">
                                      💡 <strong>Consejo:</strong> Lee este artículo completo para comprender mejor el contexto y evitar futuros errores.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
