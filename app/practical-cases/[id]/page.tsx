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
      <div className="h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex flex-col overflow-hidden">
        {/* Compact header */}
        <div className="bg-white shadow-lg border-b-4 border-orange-500 flex-shrink-0">
          <div className="max-w-screen-2xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate max-w-md">{practicalCase.title}</h1>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-base sm:text-xl font-bold text-orange-600">⏱️ {formatTime(timeElapsed)}</div>
                
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
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-gray-500 text-white font-bold rounded hover:bg-gray-600 transition"
                    >
                      ← Abandonar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={answeredCount === 0}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded hover:from-green-700 hover:to-green-800 transition disabled:opacity-50"
                    >
                      ✓ Enviar ({answeredCount}/{practicalCase.questions.length})
                    </button>
                  </>
                )}
                
                {isSubmitted && (
                  <Link
                    href="/practical-cases"
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded hover:from-blue-700 hover:to-blue-800 transition"
                  >
                    ← Volver
                  </Link>
                )}
              </div>
            </div>

            {/* Compact progress bar */}
            {!isSubmitted && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progreso</span>
                  <span>{answeredCount} / {practicalCase.questions.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout with independent scrolling */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* LEFT COLUMN: Statement (Enunciado) */}
            <div className="h-full overflow-y-auto bg-gradient-to-br from-orange-50 to-red-50 border-r-4 border-orange-300">
              <div className="p-3 sm:p-4 h-full">
                {practicalCase.statement ? (
                  <div className="bg-white rounded-lg shadow-lg border-2 border-orange-200 p-3 sm:p-4 h-full flex flex-col">
                    <h2 className="text-sm sm:text-base font-bold text-orange-900 mb-2 flex-shrink-0">📋 ENUNCIADO</h2>
                    <div className="flex-1 overflow-y-auto bg-orange-50 rounded p-2 sm:p-3 border border-orange-100">
                      <p className="text-gray-800 whitespace-pre-wrap leading-snug text-xs sm:text-sm">
                        {practicalCase.statement}
                      </p>
                    </div>
                    <p className="text-xs text-orange-600 mt-2 italic flex-shrink-0">
                      {practicalCase.statement.length} caracteres
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">⚠️ No hay enunciado disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Questions & Answers */}
            <div className="h-full overflow-y-auto bg-white">
              <div className="p-3 sm:p-4">
                {/* Results summary */}
                {isSubmitted && results && (
                  <div className="mb-4 bg-white rounded-lg shadow-lg p-4 border-2 border-blue-200">
                    <h2 className="text-lg font-bold text-center mb-3">📊 Resultados</h2>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{results.score.toFixed(1)}</p>
                        <p className="text-xs text-gray-600">Puntuación</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {results.correctAnswers}/{results.totalQuestions}
                        </p>
                        <p className="text-xs text-gray-600">Aciertos</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{formatTime(timeElapsed)}</p>
                        <p className="text-xs text-gray-600">Tiempo</p>
                      </div>
                    </div>

                    {results.scorePercentage === 100 && (
                      <div className="text-center p-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg">
                        <p className="text-xl font-bold text-white">🎉 ¡PERFECTO! 🎉</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Questions list */}
                <div className="space-y-3">
                  {practicalCase.questions.map((question, index) => {
                    const options = typeof question.options === 'string' 
                      ? JSON.parse(question.options) 
                      : question.options
                    const userAnswer = userAnswers[question.id]
                    const isCorrect = isSubmitted && userAnswer === question.correctAnswer
                    const isIncorrect = isSubmitted && userAnswer && userAnswer !== question.correctAnswer

                    return (
                      <div
                        key={question.id}
                        className={`bg-white rounded-lg shadow-md p-3 sm:p-4 border-2 ${
                          isCorrect ? 'border-green-500 bg-green-50' : 
                          isIncorrect ? 'border-red-500 bg-red-50' : 
                          'border-gray-200'
                        }`}
                      >
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">
                          Pregunta {index + 1}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-snug">{question.text}</p>

                        <div className="space-y-1.5 sm:space-y-2">
                          {['A', 'B', 'C', 'D'].map((letter, optIndex) => {
                            const isSelected = userAnswer === letter
                            const isCorrectAnswer = letter === question.correctAnswer
                            
                            let buttonClass = 'w-full text-left px-3 py-2 rounded border-2 transition text-xs sm:text-sm '
                            
                            if (isSubmitted) {
                              if (isCorrectAnswer) {
                                buttonClass += 'bg-green-100 border-green-500 text-green-900 font-bold'
                              } else if (isSelected) {
                                buttonClass += 'bg-red-100 border-red-500 text-red-900 font-bold'
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
                                <span className="font-bold mr-2">{letter})</span>
                                {options[optIndex]}
                                {isSubmitted && isCorrectAnswer && ' ✓'}
                                {isSubmitted && isSelected && !isCorrectAnswer && ' ✗'}
                              </button>
                            )
                          })}
                        </div>

                        {isSubmitted && (
                          <div className={`mt-3 p-3 rounded border-2 ${
                            isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <h4 className="font-bold text-sm mb-1">
                              {isCorrect ? '✓ Correcto' : '✗ Incorrecto'}
                            </h4>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-snug">
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
