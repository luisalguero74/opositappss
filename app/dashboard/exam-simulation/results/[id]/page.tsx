'use client'

import { use, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const score = searchParams.get('score') || '0'
  const theoryScore = searchParams.get('theory') || '0'
  const practicalScore = searchParams.get('practical') || '0'

  useEffect(() => {
    loadSimulation()
  }, [])

  const loadSimulation = async () => {
    try {
      const res = await fetch(`/api/exam-simulation/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSimulation(data)
      }
    } catch (error) {
      console.error('Error loading simulation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando resultados...</p>
      </div>
    )
  }

  const totalQuestions = 85
  const percentage = Math.round((parseInt(score) / totalQuestions) * 100)
  
  let resultColor = 'red'
  let resultText = 'No apto'
  if (percentage >= 70) {
    resultColor = 'green'
    resultText = 'Sobresaliente'
  } else if (percentage >= 50) {
    resultColor = 'yellow'
    resultText = 'Aprobado'
  }

  const theoryQuestions = simulation ? JSON.parse(simulation.theoryQuestions) : []
  const practicalCase = simulation ? JSON.parse(simulation.practicalCase) : null
  const userAnswers = simulation ? JSON.parse(simulation.userAnswers || '{"theory":[],"practical":[]}') : { theory: [], practical: [] }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header con resultados */}
        <div className={`rounded-xl shadow-2xl p-8 mb-8 bg-gradient-to-r ${
          resultColor === 'green' ? 'from-green-600 to-emerald-600' :
          resultColor === 'yellow' ? 'from-yellow-500 to-orange-500' :
          'from-red-600 to-pink-600'
        }`}>
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">📊 Resultados del Examen</h1>
            <div className="text-6xl font-bold mb-2">{score}/85</div>
            <div className="text-2xl mb-4">{percentage}%</div>
            <div className="text-xl font-semibold">{resultText}</div>
          </div>
        </div>

        {/* Desglose de puntuaciones */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Parte 1: Teoría</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">{theoryScore}/70</div>
              <div className="text-gray-600">
                {Math.round((parseInt(theoryScore) / 70) * 100)}% de acierto
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💼 Parte 2: Práctico</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-600 mb-2">{practicalScore}/15</div>
              <div className="text-gray-600">
                {Math.round((parseInt(practicalScore) / 15) * 100)}% de acierto
              </div>
            </div>
          </div>
        </div>

        {/* Tiempo empleado */}
        {simulation?.timeSpent && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">⏱️ Tiempo empleado</h2>
            <p className="text-gray-700">{simulation.timeSpent} minutos de 120 disponibles</p>
          </div>
        )}

        {/* Soluciones - Teoría */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Soluciones - Parte 1: Teoría</h2>
          <div className="space-y-4">
            {theoryQuestions.map((q: any, idx: number) => {
              const userAnswer = userAnswers.theory[idx]
              const isCorrect = userAnswer === q.correctAnswer
              
              return (
                <div key={idx} className={`p-4 rounded-lg border-2 ${
                  isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                }`}>
                  <p className="font-bold text-gray-900 mb-2">
                    {idx + 1}. {q.text}
                  </p>
                  <div className="space-y-2 ml-4">
                    {q.options.map((opt: string, optIdx: number) => {
                      const isUserAnswer = opt === userAnswer
                      const isCorrectAnswer = opt === q.correctAnswer
                      
                      return (
                        <div key={optIdx} className={`p-2 rounded ${
                          isCorrectAnswer ? 'bg-green-200 font-bold' :
                          isUserAnswer ? 'bg-red-200' :
                          'bg-gray-100'
                        }`}>
                          {opt}
                          {isCorrectAnswer && ' ✅'}
                          {isUserAnswer && !isCorrectAnswer && ' ❌'}
                        </div>
                      )
                    })}
                  </div>
                  {!isCorrect && (
                    <div className="mt-2 text-sm text-gray-700">
                      <strong>Tu respuesta:</strong> {userAnswer || 'Sin responder'}
                      <br />
                      <strong>Respuesta correcta:</strong> {q.correctAnswer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Soluciones - Práctico */}
        {practicalCase && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💼 Soluciones - Parte 2: Práctico</h2>
            
            {/* Enunciado */}
            <div className="bg-orange-50 rounded-lg p-6 mb-6 border-2 border-orange-200">
              <h3 className="font-bold text-orange-900 mb-2">Enunciado:</h3>
              <div className="text-gray-800 whitespace-pre-wrap">{practicalCase.enunciado}</div>
            </div>

            {/* Preguntas */}
            <div className="space-y-4">
              {practicalCase.questions.map((q: any, idx: number) => {
                const userAnswer = userAnswers.practical[idx]
                const isCorrect = userAnswer === q.correctAnswer
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${
                    isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}>
                    <p className="font-bold text-gray-900 mb-2">
                      {idx + 1}. {q.text}
                    </p>
                    <div className="space-y-2 ml-4">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isUserAnswer = opt === userAnswer
                        const isCorrectAnswer = opt === q.correctAnswer
                        
                        return (
                          <div key={optIdx} className={`p-2 rounded ${
                            isCorrectAnswer ? 'bg-green-200 font-bold' :
                            isUserAnswer ? 'bg-red-200' :
                            'bg-gray-100'
                          }`}>
                            {opt}
                            {isCorrectAnswer && ' ✅'}
                            {isUserAnswer && !isCorrectAnswer && ' ❌'}
                          </div>
                        )
                      })}
                    </div>
                    {!isCorrect && (
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Tu respuesta:</strong> {userAnswer || 'Sin responder'}
                        <br />
                        <strong>Respuesta correcta:</strong> {q.correctAnswer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard/exam-simulation"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-lg"
          >
            🏠 Volver a Simulacros
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-lg hover:from-gray-700 hover:to-gray-800 transition shadow-lg"
          >
            📊 Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
