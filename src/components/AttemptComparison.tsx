'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AttemptHistory {
  attemptNumber: number
  id: string
  score: number
  totalQuestions: number
  percentage: number
  date: string
}

interface AttemptComparisonProps {
  questionnaireId: string
}

export default function AttemptComparison({ questionnaireId }: AttemptComparisonProps) {
  const [history, setHistory] = useState<AttemptHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    fetch(`/api/questionnaires/${questionnaireId}/history`)
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [questionnaireId])

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return null
  }

  const currentAttempt = history[0]
  const previousAttempt = history[1]
  const bestAttempt = [...history].sort((a, b) => b.percentage - a.percentage)[0]
  const avgPercentage = Math.round(
    history.reduce((sum, h) => sum + h.percentage, 0) / history.length
  )

  const improvement = previousAttempt 
    ? currentAttempt.percentage - previousAttempt.percentage 
    : 0

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="w-full p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div className="text-left">
              <div className="font-bold text-gray-900 dark:text-white">Comparativa de Intentos</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {history.length} {history.length === 1 ? 'intento' : 'intentos'} realizados
              </div>
            </div>
          </div>
          <span className="text-gray-400">{showComparison ? '▼' : '▶'}</span>
        </div>
      </button>

      {showComparison && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentAttempt.percentage}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Último intento</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{bestAttempt.percentage}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Mejor marca</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{avgPercentage}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Promedio</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className={`text-2xl font-bold ${improvement >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {improvement > 0 ? '+' : ''}{improvement}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Mejora</div>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Evolución</div>
            <div className="space-y-2">
              {history.slice().reverse().map((attempt, index) => (
                <div key={attempt.id} className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 w-16">#{attempt.attemptNumber}</div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end pr-2 text-xs font-bold text-white transition-all ${
                        attempt.percentage >= 80 ? 'bg-green-500' :
                        attempt.percentage >= 60 ? 'bg-blue-500' :
                        attempt.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${attempt.percentage}%` }}
                    >
                      {attempt.percentage}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 w-24 text-right">
                    {new Date(attempt.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Link to full stats */}
          <Link
            href="/statistics"
            className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
          >
            Ver estadísticas completas →
          </Link>
        </div>
      )}
    </div>
  )
}
