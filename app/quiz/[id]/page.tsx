'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Confetti from 'react-confetti'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface TemaInfo {
  codigo: string
  numero: number
  parte: string
  titulo: string
}

interface Questionnaire {
  id: string
  title: string
  type: string
  questions: Question[]
  temaInfo?: TemaInfo | null
}

interface UserAnswer {
  questionId: string
  selectedAnswer: string
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [timeLeft, setTimeLeft] = useState(45 * 60)
  const [timeExpired, setTimeExpired] = useState(false)
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set())
  const [markingQuestion, setMarkingQuestion] = useState<string | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (params.id) {
      // Cargar cuestionario
      fetch(`/api/questionnaires/${params.id}`)
        .then(res => res.json())
        .then(data => {
          // Parse options JSON for each question
          const parsedData = {
            ...data,
            questions: data.questions.map((q: any) => ({
              ...q,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }))
          }
          setQuestionnaire(parsedData)
          setLoading(false)
          
          // Cargar preguntas marcadas del usuario para este cuestionario
          if (parsedData.questions?.length > 0) {
            fetch('/api/user/marked-questions')
              .then(res => res.json())
              .then(markedData => {
                if (markedData.marked) {
                  const markedIds = new Set<string>(markedData.marked.map((m: any) => m.questionId as string))
                  setMarkedQuestions(markedIds)
                }
              })
              .catch(err => console.error('Error loading marked questions:', err))
          }
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [params.id, router, status])

  // Countdown timer: 45 minutes
  useEffect(() => {
    if (loading || showResults) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimeExpired(true)
          if (!showResults) {
            // Auto-submit when time expires
            handleCorrection()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, showResults])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId)
      if (existing) {
        return prev.map(a => 
          a.questionId === questionId 
            ? { ...a, selectedAnswer: answer } 
            : a
        )
      }
      return [...prev, { questionId, selectedAnswer: answer }]
    })
  }

  const markQuestion = async (questionId: string, type: 'doubt' | 'review' | 'important', notes?: string) => {
    setMarkingQuestion(questionId)
    try {
      const res = await fetch('/api/user/marked-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, type, notes })
      })

      if (res.ok) {
        setMarkedQuestions(prev => new Set(prev).add(questionId))
        
        // Mostrar notificación de éxito
        const typeText = type === 'doubt' ? 'Duda 🤔' : type === 'review' ? 'Repasar 📚' : 'Importante ⭐'
        const toast = document.createElement('div')
        toast.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in'
        toast.textContent = `✓ Marcada como: ${typeText}`
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 2000)
      } else {
        const errorData = await res.json()
        console.error('Error al marcar:', errorData)
        alert('Error al marcar la pregunta. Inténtalo de nuevo.')
      }
    } catch (err) {
      console.error('Error marking question:', err)
      alert('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setMarkingQuestion(null)
    }
  }

  const playVictorySound = () => {
    try {
      const audio = new Audio('/sounds/fanfarria.mp3')
      audio.volume = 0.7
      audio.play()
        .then(() => setSoundEnabled(true))
        .catch(err => {
          console.log('Audio play failed:', err)
          setSoundEnabled(false)
        })
    } catch (error) {
      console.log('Audio playback not supported:', error)
    }
  }

  const handleCorrection = async () => {
    if (!questionnaire) return

    setSubmitting(true)
    
    try {
      const answers = questionnaire.questions.map(q => {
        const userAnswer = userAnswers.find(a => a.questionId === q.id)
        const correctLetter = getCorrectLetter(q)
        const selectedAnswer = userAnswer?.selectedAnswer || ''
        
        return {
          questionId: q.id,
          selectedAnswer,
          correctAnswer: correctLetter,
          isCorrect: selectedAnswer === correctLetter
        }
      })

      const response = await fetch('/api/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaireId: questionnaire.id,
          answers
        })
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Error al guardar respuestas:', text)
        alert('No se han podido guardar tus respuestas en estadísticas. ' + text)
      } else {
        const data = await response.json().catch(() => null)
        console.log('✓ Respuestas guardadas en estadísticas', data)
      }

      setShowResults(true)
      
      // Check if perfect score for celebration
      const correctCount = answers.filter(a => a.isCorrect).length
      if (correctCount === questionnaire.questions.length) {
        setShowCelebration(true)
        // Play victory sound with Web Audio API
        playVictorySound()
      }
    } catch (error) {
      console.error('Error submitting answers:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getResults = () => {
    if (!questionnaire) return { correct: 0, total: 0, percentage: 0 }
    
    const total = questionnaire.questions.length
    const correct = questionnaire.questions.filter(q => {
      const userAnswer = userAnswers.find(a => a.questionId === q.id)
      return userAnswer?.selectedAnswer === getCorrectLetter(q)
    }).length
    
    return {
      correct,
      total,
      percentage: Math.round((correct / total) * 100)
    }
  }

  // Normalize correct answer letter: supports legacy data with text
  const getCorrectLetter = (question: Question): string => {
    const ca = question.correctAnswer?.toLowerCase()
    if (['a','b','c','d'].includes(ca)) return ca
    const idx = question.options.findIndex(opt => opt === question.correctAnswer)
    return idx >= 0 ? String.fromCharCode(97 + idx) : 'a'
  }

  const getQuestionResult = (questionId: string) => {
    const question = questionnaire?.questions.find(q => q.id === questionId)
    const userAnswer = userAnswers.find(a => a.questionId === questionId)
    if (!question || !userAnswer) return null
    const correctLetter = getCorrectLetter(question)
    return {
      isCorrect: userAnswer.selectedAnswer === correctLetter,
      correctAnswer: correctLetter,
      explanation: question.explanation
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cuestionario...</p>
        </div>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Cuestionario no encontrado</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const results = getResults()
  const allAnswered = userAnswers.length === questionnaire.questions.length
  const hasAnswers = userAnswers.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {questionnaire.temaInfo ? (
                <>
                  <p className="text-sm font-semibold text-blue-600 mb-1">
                    {questionnaire.temaInfo.parte} - Tema {questionnaire.temaInfo.numero}
                  </p>
                  <h1 className="text-3xl font-bold text-gray-900">{questionnaire.temaInfo.titulo}</h1>
                </>
              ) : (
                <h1 className="text-3xl font-bold text-gray-900">{questionnaire.title}</h1>
              )}
              <p className="text-gray-600 mt-1">
                {questionnaire.type === 'theory' ? '📘 Teoría' : '📗 Práctico'} · {questionnaire.questions.length} preguntas
              </p>
            </div>
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg font-semibold ${timeExpired ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                    ⏱️ {timeExpired ? 'Tiempo agotado' : `Tiempo restante: ${formatTime(timeLeft)}`}
                  </div>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    ✕
                  </button>
                </div>
          </div>
        </div>

        {/* Results Summary */}
        {showResults && (
          <div className={`mb-6 rounded-xl shadow-lg p-6 ${
            results.percentage >= 70 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}>
            <h2 className="text-2xl font-bold mb-4">
              {results.percentage >= 70 ? '✅ ¡Muy bien!' : '❌ Puedes mejorar'}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{results.correct}</div>
                <div className="text-sm text-gray-600">Aciertos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{results.total - results.correct}</div>
                <div className="text-sm text-gray-600">Fallos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{results.percentage}%</div>
                <div className="text-sm text-gray-600">Puntuación</div>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questionnaire.questions.map((question, index) => {
            const questionResult = showResults ? getQuestionResult(question.id) : null
            const userAnswer = userAnswers.find(a => a.questionId === question.id)

            return (
              <div
                key={question.id}
                className={`bg-white rounded-xl shadow-lg p-6 transition-all ${
                  showResults && questionResult
                    ? questionResult.isCorrect
                      ? 'border-2 border-green-400'
                      : 'border-2 border-red-400'
                    : ''
                }`}
              >
                {/* Question Text */}
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-blue-600 font-semibold mr-2">PREGUNTA {index + 1}:</span>
                      <span className="text-lg font-bold text-gray-900">{question.text}</span>
                    </div>
                    {/* Botones para marcar pregunta */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => markQuestion(question.id, 'doubt')}
                        disabled={markingQuestion === question.id}
                        className={`p-2 rounded-lg transition-all ${
                          markedQuestions.has(question.id)
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-yellow-50'
                        }`}
                        title="Marcar como duda"
                      >
                        🤔
                      </button>
                      <button
                        onClick={() => markQuestion(question.id, 'review')}
                        disabled={markingQuestion === question.id}
                        className={`p-2 rounded-lg transition-all ${
                          markedQuestions.has(question.id)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                        }`}
                        title="Marcar para repasar"
                      >
                        📚
                      </button>
                      <button
                        onClick={() => markQuestion(question.id, 'important')}
                        disabled={markingQuestion === question.id}
                        className={`p-2 rounded-lg transition-all ${
                          markedQuestions.has(question.id)
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                        }`}
                        title="Marcar como importante"
                      >
                        ⭐
                      </button>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {question.options.map((option, optIndex) => {
                    const optionLetter = String.fromCharCode(97 + optIndex) // a, b, c, d
                    const isSelected = userAnswer?.selectedAnswer === optionLetter
                    const isCorrect = optionLetter === getCorrectLetter(question)
                    
                    let optionClass = 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    
                    if (showResults) {
                      if (isCorrect) {
                        optionClass = 'bg-green-100 border-green-400 border-2'
                      } else if (isSelected && !isCorrect) {
                        optionClass = 'bg-red-100 border-red-400 border-2'
                      }
                    } else if (isSelected) {
                      optionClass = 'bg-blue-100 border-blue-400 border-2'
                    }

                    return (
                      <label
                        key={optIndex}
                        className={`flex items-start p-4 rounded-lg border cursor-pointer transition-all ${optionClass}`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={optionLetter}
                          checked={isSelected}
                          onChange={() => !showResults && !timeExpired && handleAnswerChange(question.id, optionLetter)}
                          disabled={showResults || timeExpired}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700 mr-2">OPCIÓN {optionLetter.toUpperCase()}:</span>
                          <span className="text-gray-900">{option}</span>
                          
                          {showResults && isCorrect && (
                            <div className="mt-2 flex items-start">
                              <span className="text-green-700 mr-1">✓</span>
                              <span className="text-sm text-green-700">Respuesta correcta</span>
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Explanation */}
                {showResults && questionResult && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    questionResult.isCorrect ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="font-semibold text-gray-700 mb-2">MOTIVACIÓN:</div>
                    <p className="text-gray-800">{question.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          {!showResults ? (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCorrection}
                disabled={submitting || timeExpired}
                className={`px-8 py-3 rounded-lg font-bold text-white transition-all ${
                  !submitting && !timeExpired
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                title={!allAnswered ? `Has respondido ${userAnswers.length} de ${questionnaire.questions.length} preguntas. Puedes corregir igualmente.` : 'Corregir todas las respuestas'}
              >
                {submitting ? 'Enviando...' : allAnswered ? '✓ CORRECCIÓN' : `✓ CORRECCIÓN (${userAnswers.length}/${questionnaire.questions.length})`}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/statistics')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                📊 Ver Estadísticas
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                🏠 Volver al Inicio
              </button>
              <button
                onClick={() => {
                  setUserAnswers([])
                  setShowResults(false)
                  setShowCelebration(false)
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                🔄 Reintentar
              </button>
            </>
          )}
        </div>

        {/* Celebration Modal for 100% */}
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
                
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-transparent to-yellow-400 rounded"></div>
                  <p className="text-3xl font-bold text-gray-800">
                    100% de aciertos
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-l from-transparent to-yellow-400 rounded"></div>
                </div>
                
                <div className="bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 rounded-2xl p-6 mb-8 border-2 border-green-300 shadow-inner">
                  <p className="text-2xl font-bold text-green-800 leading-relaxed">
                    ¡Sigue así y tu plaza estará más cerca!
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCelebration(false)}
                      className="px-10 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-lg rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                    >
                      ¡Genial! 🎉
                    </button>
                    <button
                      onClick={playVictorySound}
                      className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 text-white ${
                        soundEnabled
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600'
                      }`}
                    >
                      {soundEnabled ? '🔊 Sonido listo' : '🔈 Activar sonido'}
                    </button>
                  </div>
                  {!soundEnabled && (
                    <p className="text-sm text-gray-700 bg-white/60 px-3 py-2 rounded-lg border border-yellow-200">
                      Si no escuchas la fanfarria, pulsa "Activar sonido" (algunos navegadores bloquean el audio automático).
                    </p>
                  )}
                </div>
              </div>
            </div>
            <style jsx>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(-50px) scale(0.8);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  )
}
