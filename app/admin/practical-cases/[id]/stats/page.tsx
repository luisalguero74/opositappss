'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Attempt {
  id: string
  score: number
  correctAnswers: number
  totalQuestions: number
  timeSpent: number
  completedAt: string
  answers: {
    questionId: string
    selectedAnswer: string
    isCorrect: boolean
    question: {
      id: string
      text: string
      correctAnswer: string
      explanation: string
    }
  }[]
}

interface QuestionStats {
  questionId: string
  text: string
  totalAttempts: number
  failures: number
  failureRate: number
  correctAnswer: string
  explanation: string
}

export default function PracticalCaseStats() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/dashboard')
    } else if (status === 'authenticated' && params.id) {
      loadStats()
    }
  }, [status, session, router, params.id])

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/admin/practical-cases/${params.id}/stats`)
      if (res.ok) {
        const data = await res.json()
        setAttempts(data.attempts)
        setQuestionStats(data.questionStats)
        setTitle(data.title)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = {
    labels: attempts.map((_, i) => `Intento ${i + 1}`).reverse(),
    datasets: [
      {
        label: 'Puntuación (%)',
        data: attempts.map(a => a.score).reverse(),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.3
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Evolución de Puntuaciones'
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  }

  // Get recurring errors (questions with >50% failure rate and >2 attempts)
  const recurringErrors = questionStats
    .filter(q => q.failureRate > 50 && q.totalAttempts > 2)
    .sort((a, b) => b.failureRate - a.failureRate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/practical-cases" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">
            ← Volver a Supuestos Prácticos
          </Link>
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h1 className="text-4xl font-bold text-white mb-2">Estadísticas y Evolución</h1>
              <p className="text-orange-100">{title}</p>
            </div>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">No hay intentos registrados aún</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <p className="text-4xl font-bold text-blue-600">{attempts.length}</p>
                <p className="text-gray-600 mt-2">Total Intentos</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <p className="text-4xl font-bold text-green-600">
                  {Math.max(...attempts.map(a => a.score)).toFixed(1)}%
                </p>
                <p className="text-gray-600 mt-2">Mejor Puntuación</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <p className="text-4xl font-bold text-purple-600">
                  {(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(1)}%
                </p>
                <p className="text-gray-600 mt-2">Promedio</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                <p className="text-4xl font-bold text-orange-600">
                  {Math.floor(attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length / 60)}m
                </p>
                <p className="text-gray-600 mt-2">Tiempo Promedio</p>
              </div>
            </div>

            {/* Evolution chart */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Evolución de Puntuaciones</h2>
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Recurring errors */}
            {recurringErrors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  ⚠️ Preguntas con Errores Recurrentes
                </h2>
                <p className="text-gray-600 mb-6">
                  Estas son las preguntas que has fallado más frecuentemente. Revisa las motivaciones para mejorar.
                </p>

                <div className="space-y-6">
                  {recurringErrors.map((stat, index) => (
                    <div key={stat.questionId} className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">
                          Pregunta #{index + 1}
                        </h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            {stat.failureRate.toFixed(0)}%
                          </p>
                          <p className="text-sm text-gray-600">
                            Fallos: {stat.failures}/{stat.totalAttempts}
                          </p>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4 font-semibold">{stat.text}</p>

                      <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 mb-4">
                        <p className="font-bold text-green-900 mb-2">
                          ✓ Respuesta Correcta: {stat.correctAnswer}
                        </p>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <p className="font-bold text-blue-900 mb-2">📚 Motivación Legal:</p>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {stat.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All attempts list */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Historial de Intentos</h2>
              
              <div className="space-y-4">
                {attempts.map((attempt, index) => (
                  <div key={attempt.id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-orange-400 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          Intento #{attempts.length - index}
                        </h3>
                        <p className="text-gray-600">
                          {new Date(attempt.completedAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-orange-600">
                          {attempt.score.toFixed(1)}%
                        </p>
                        <p className="text-gray-600">
                          {attempt.correctAnswers}/{attempt.totalQuestions} correctas
                        </p>
                        <p className="text-gray-500 text-sm">
                          Tiempo: {Math.floor(attempt.timeSpent / 60)}:{(attempt.timeSpent % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
