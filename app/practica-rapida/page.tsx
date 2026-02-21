'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  temaCodigo: string
}

export default function PracticaRapidaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(5)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const startQuickPractice = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quick-practice?count=${questionCount}`)
      const data = await res.json()
      
      if (res.ok && data.questions) {
        const parsedQuestions = data.questions.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }))
        setQuestions(parsedQuestions)
        setCurrentIndex(0)
        setUserAnswers({})
        setShowResults(false)
      } else {
        alert('Error al cargar preguntas: ' + (data.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (answer: string) => {
    if (showResults) return
    setUserAnswers(prev => ({
      ...prev,
      [questions[currentIndex].id]: answer
    }))
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const finishPractice = async () => {
    setShowResults(true)
    
    // Guardar estadísticas
    try {
      const results = getResults()
      const answersArray = questions.map(q => ({
        questionId: q.id,
        selectedAnswer: userAnswers[q.id] || '',
        isCorrect: userAnswers[q.id] && userAnswers[q.id].toLowerCase() === q.correctAnswer.toLowerCase()
      }))

      await fetch('/api/quick-practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersArray,
          score: results.percentage,
          correctAnswers: results.correct,
          totalQuestions: questions.length,
          timeSpent: 0 // Podríamos añadir un timer en el futuro
        })
      })

      // Actualizar racha de estudio
      await fetch('/api/user/streak', { method: 'POST' })
    } catch (error) {
      console.error('Error guardando estadísticas:', error)
      // No mostramos error al usuario, las estadísticas son secundarias
    }
  }

  const getResults = () => {
    let correct = 0
    let answered = 0
    let blank = 0
    
    questions.forEach(q => {
      const userAnswer = userAnswers[q.id]
      if (userAnswer && userAnswer.trim() !== '') {
        answered++
        if (userAnswer.toLowerCase() === q.correctAnswer.toLowerCase()) {
          correct++
        }
      } else {
        blank++
      }
    })
    
    return {
      correct,
      incorrect: answered - correct,
      blank,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">⚡</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Práctica Rápida</h1>
              <p className="text-gray-600">Repaso express para aprovechar cada minuto</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de preguntas
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 preguntas (2 minutos)</option>
                <option value={10}>10 preguntas (5 minutos)</option>
                <option value={15}>15 preguntas (7 minutos)</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">✨ Características:</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✓ Preguntas aleatorias del banco completo</li>
                <li>✓ Sin temporizador - a tu ritmo</li>
                <li>✓ Resultados inmediatos</li>
                <li>✓ Perfecto para repasos de 5 minutos</li>
              </ul>
            </div>

            <button
              onClick={startQuickPractice}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg disabled:opacity-50"
            >
              {loading ? '⏳ Cargando...' : '🚀 Iniciar Práctica'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showResults) {
    const results = getResults()
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">
                {results.percentage >= 80 ? '🎉' : results.percentage >= 60 ? '👍' : '📚'}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {results.percentage >= 80 ? '¡Excelente!' : results.percentage >= 60 ? '¡Buen trabajo!' : '¡Sigue practicando!'}
              </h2>
              <p className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {results.percentage}%
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{results.correct}</div>
                <div className="text-sm text-green-700">Correctas</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{results.total - results.correct}</div>
                <div className="text-sm text-red-700">Incorrectas</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{results.total}</div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-bold text-lg text-gray-900">Revisión de Respuestas:</h3>
              {questions.map((q, idx) => {
                const userAnswer = userAnswers[q.id]
                const isCorrect = userAnswer && userAnswer.toLowerCase() === q.correctAnswer.toLowerCase()
                
                // Encontrar el índice basado en la letra
                const getUserAnswerIndex = () => {
                  if (!userAnswer) return -1
                  return userAnswer.charCodeAt(0) - 97 // 'a' = 0, 'b' = 1, etc
                }
                
                const getCorrectAnswerIndex = () => {
                  return q.correctAnswer.charCodeAt(0) - 97
                }
                
                const userAnswerIndex = getUserAnswerIndex()
                const correctIndex = getCorrectAnswerIndex()

                return (
                  <div key={q.id} className={`p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className="font-semibold">{idx + 1}. {q.text}</span>
                      </div>
                      <span className="text-2xl ml-2">{isCorrect ? '✅' : '❌'}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="text-green-700">
                        ✓ Correcta: {q.correctAnswer.toUpperCase()}) {q.options[correctIndex]}
                      </div>
                      {!isCorrect && (
                        <div className="text-red-700">
                          {userAnswers[q.id] ? (
                            `✗ Tu respuesta: ${userAnswers[q.id].toUpperCase()}) ${q.options[userAnswerIndex]}`
                          ) : (
                            '✗ Tu respuesta: (en blanco)'
                          )}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs">
                          💡 {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setQuestions([])
                  setShowResults(false)
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
              >
                🔄 Nueva Práctica
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  // Permitir finalizar aunque haya respuestas en blanco
  const canFinish = questions.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-sm font-medium text-blue-600">
              ⚡ Práctica Rápida
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {currentQuestion.temaCodigo || 'General'}
            </span>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const letter = String.fromCharCode(97 + idx)
              const isSelected = userAnswers[currentQuestion.id] === letter

              return (
                <label
                  key={idx}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={letter}
                      checked={isSelected}
                      onChange={() => selectAnswer(letter)}
                      className="mr-3 w-5 h-5 text-blue-600"
                    />
                    <span className="font-semibold mr-2">{letter.toUpperCase()})</span>
                    <span>{option}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={previousQuestion}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Respondidas: {Object.keys(userAnswers).length}/{questions.length}
              </p>
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={nextQuestion}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={finishPractice}
                disabled={!canFinish}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ✓ Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
