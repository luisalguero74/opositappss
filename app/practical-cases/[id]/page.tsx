'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Confetti from 'react-confetti'

interface Question {
  id: string
  text: string
  options: string | string[] // Puede venir como string o array
  correctAnswer: string
  explanation: string
}

interface PracticalCase {
  id: string
  title: string
  theme: string | null
  statement: string | null
  questions: Question[]
}

interface UserAnswer {
  questionId: string
  selectedAnswer: string
}

export default function TakePracticalCase() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [practicalCase, setPracticalCase] = useState<PracticalCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [practicalId, setPracticalId] = useState<string | null>(null)

  // Obtener ID de forma segura
  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    if (id) {
      setPracticalId(id)
    }
  }, [params.id])

  // Window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const playVictorySound = () => {
    try {
      const audio = new Audio('/sounds/fanfarria.mp3')
      audio.volume = 0.7
      audio.play().catch(err => console.log('Audio play failed:', err))
    } catch (error) {
      console.log('Audio playback not supported:', error)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && practicalId) {
      loadPracticalCase()
    }
  }, [status, router, practicalId])

  useEffect(() => {
    if (!isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isSubmitted])

  const loadPracticalCase = async () => {
    if (!practicalId) {
      console.error('❌ No practical ID available')
      return
    }

    try {
      const res = await fetch(`/api/practical-cases/${practicalId}`)
      if (res.ok) {
        const data = await res.json()
        setPracticalCase(data.practicalCase)
      } else {
        console.error('❌ API Response not OK:', res.status)
        router.push('/practical-cases')
      }
    } catch (error) {
      console.error('❌ Error loading practical case:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!practicalCase || !practicalId) return

    const answers: UserAnswer[] = practicalCase.questions.map(q => ({
      questionId: q.id,
      selectedAnswer: userAnswers[q.id] || ''
    }))

    try {
      const res = await fetch(`/api/practical-cases/${practicalId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          timeSpent: timeElapsed
        })
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setIsSubmitted(true)

        if (data.scorePercentage === 100) {
          setShowCelebration(true)
          playVictorySound()
        }
      }
    } catch (error) {
      console.error('Error submitting answers:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando supuesto práctico...</p>
        </div>
      </div>
    )
  }

  if (!practicalCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Supuesto práctico no encontrado</p>
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(userAnswers).length
  const progressPercentage = (answeredCount / practicalCase.questions.length) * 100

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 pb-20">
        {/* Sticky header with statement */}
        <div className="sticky top-0 z-50 bg-white shadow-lg border-b-4 border-orange-500">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">{practicalCase.title}</h1>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-orange-600">⏱️ {formatTime(timeElapsed)}</div>
                
                {!isSubmitted && (
                  <>
                    <button
                      onClick={() => {
                        const hasAnswers = answeredCount > 0
                        if (hasAnswers) {
                          if (confirm('¿Estás seguro de que quieres abandonar? Se perderá tu progreso actual.')) {
                            router.push('/practical-cases')
                          }
                        } else {
                          router.push('/practical-cases')
                        }
                      }}
                      className="px-6 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition"
                    >
                      ← Abandonar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={answeredCount === 0}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50"
                    >
                      ✓ Enviar ({answeredCount}/{practicalCase.questions.length})
                    </button>
                  </>
                )}
                
                {isSubmitted && (
                  <Link
                    href="/practical-cases"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition"
                  >
                    ← Volver al listado
                  </Link>
                )}
              </div>
            </div>

            {/* Statement - Con scroll para textos largos */}
            {practicalCase.statement ? (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 mb-4">
                <h2 className="text-lg font-bold text-orange-900 mb-3">📋 ENUNCIADO DEL SUPUESTO</h2>
                <div className="max-h-96 overflow-y-auto bg-white rounded p-4 border border-orange-100 shadow-inner">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {practicalCase.statement}
                  </p>
                </div>
                <p className="text-xs text-orange-600 mt-2 italic">
                  ({practicalCase.statement.length} caracteres)
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-4">
                <p className="text-yellow-800 text-sm">⚠️ No hay enunciado disponible para este supuesto</p>
              </div>
            )}

            {/* Progress bar */}
            {!isSubmitted && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progreso</span>
                  <span>{answeredCount} de {practicalCase.questions.length} preguntas</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-orange-600 to-red-600 h-3 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="max-w-7xl mx-auto p-6">
          {isSubmitted && results && (
            <div className="mb-6 bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-center mb-6">📊 Resultados</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <p className="text-4xl font-bold text-blue-600">{results.score.toFixed(1)}</p>
                  <p className="text-gray-600 mt-2">Puntuación</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <p className="text-4xl font-bold text-green-600">
                    {results.correctAnswers}/{results.totalQuestions}
                  </p>
                  <p className="text-gray-600 mt-2">Aciertos</p>
                </div>
                <div className="text-center p-6 bg-orange-50 rounded-xl">
                  <p className="text-4xl font-bold text-orange-600">{formatTime(timeElapsed)}</p>
                  <p className="text-gray-600 mt-2">Tiempo Total</p>
                </div>
              </div>

              {results.scorePercentage === 100 && (
                <div className="text-center p-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl">
                  <p className="text-3xl font-bold text-white">🎉 ¡PERFECTO! 🎉</p>
                  <p className="text-white mt-2">Has conseguido el 100%</p>
                </div>
              )}

              <div className="text-center mt-6">
                <Link
                  href="/practical-cases"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-lg hover:from-orange-700 hover:to-red-700 transition"
                >
                  ← Volver a Supuestos Prácticos
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {practicalCase.questions.map((question, index) => {
              // Manejar options tanto si viene como string o como array
              const options = typeof question.options === 'string' 
                ? JSON.parse(question.options) 
                : question.options
              const userAnswer = userAnswers[question.id]
              const isCorrect = isSubmitted && userAnswer === question.correctAnswer
              const isIncorrect = isSubmitted && userAnswer && userAnswer !== question.correctAnswer

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-2xl shadow-xl p-8 ${
                    isCorrect ? 'border-4 border-green-500' : 
                    isIncorrect ? 'border-4 border-red-500' : ''
                  }`}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    Pregunta {index + 1}
                  </h3>
                  <p className="text-gray-700 mb-6">{question.text}</p>

                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((letter, optIndex) => {
                      const isSelected = userAnswer === letter
                      const isCorrectAnswer = letter === question.correctAnswer
                      
                      let buttonClass = 'w-full text-left px-6 py-4 rounded-lg border-2 transition '
                      
                      if (isSubmitted) {
                        if (isCorrectAnswer) {
                          buttonClass += 'bg-green-50 border-green-500 text-green-900 font-bold'
                        } else if (isSelected) {
                          buttonClass += 'bg-red-50 border-red-500 text-red-900 font-bold'
                        } else {
                          buttonClass += 'bg-gray-50 border-gray-200 text-gray-600'
                        }
                      } else {
                        if (isSelected) {
                          buttonClass += 'bg-orange-100 border-orange-500 text-orange-900 font-bold'
                        } else {
                          buttonClass += 'bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                        }
                      }

                      return (
                        <button
                          key={letter}
                          onClick={() => !isSubmitted && setUserAnswers({ ...userAnswers, [question.id]: letter })}
                          disabled={isSubmitted}
                          className={buttonClass}
                        >
                          <span className="font-bold mr-3">{letter})</span>
                          {options[optIndex]}
                          {isSubmitted && isCorrectAnswer && ' ✓'}
                          {isSubmitted && isSelected && !isCorrectAnswer && ' ✗'}
                        </button>
                      )
                    })}
                  </div>

                  {isSubmitted && (
                    <div className={`mt-6 p-6 rounded-lg ${
                      isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                    }`}>
                      <h4 className="font-bold text-lg mb-2">
                        {isCorrect ? '✓ Correcto' : '✗ Incorrecto'}
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Celebration modal */}
      {showCelebration && (
        <>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={800}
            gravity={0.25}
            colors={['#FFD700', '#FFA500', '#FF6347', '#90EE90', '#87CEEB', '#FF69B4']}
          />
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <div 
              className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center relative overflow-hidden"
              style={{ animation: 'slideIn 0.5s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative stars */}
              <div className="absolute top-4 left-4 text-yellow-400 text-3xl animate-pulse">⭐</div>
              <div className="absolute top-4 right-4 text-yellow-400 text-3xl animate-pulse" style={{ animationDelay: '0.2s' }}>⭐</div>
              <div className="absolute bottom-4 left-8 text-orange-400 text-2xl animate-pulse" style={{ animationDelay: '0.4s' }}>✨</div>
              <div className="absolute bottom-4 right-8 text-orange-400 text-2xl animate-pulse" style={{ animationDelay: '0.6s' }}>✨</div>
              
              {/* Trophy with glow effect */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 blur-xl bg-yellow-400 opacity-50 rounded-full"></div>
                <div className="text-9xl relative animate-pulse">🏆</div>
              </div>
              
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mb-4 drop-shadow-lg">
                ¡PERFECTO!
              </h2>
              
              <div className="bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 rounded-2xl p-6 mb-8 border-2 border-green-300 shadow-inner">
                <p className="text-2xl font-bold text-green-800 leading-relaxed">
                  ¡Sigue así y tu plaza estará más cerca!
                </p>
              </div>
              
              <button
                onClick={() => setShowCelebration(false)}
                className="px-10 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-lg rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 shadow-xl transition-all transform hover:scale-105 active:scale-95"
              >
                ¡Genial! 🎉
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
