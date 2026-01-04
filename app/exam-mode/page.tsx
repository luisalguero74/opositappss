'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  temaCodigo?: string
  temaNumero?: number
  temaTitulo?: string
}

export default function ExamModePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [timeLeft, setTimeLeft] = useState(120 * 60) // 120 minutos en segundos
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && !started) {
      fetchQuestions()
    }
  }, [status, router, started])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (started && !finished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishExam()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [started, finished, timeLeft])

  const fetchQuestions = async () => {
    try {
      // Obtener 85 preguntas aleatorias (70 generales + 15 específicas)
      const res = await fetch('/api/questions/random?count=85')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startExam = () => {
    setStarted(true)
    setTimeLeft(120 * 60)
  }

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentIndex]: answer })
  }

  const finishExam = () => {
    setFinished(true)
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        correct++
      }
    })
    setScore(correct)
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
    </div>
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl">
          <div className="text-6xl text-center mb-6">📝</div>
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
            Modo Examen
          </h1>
          <div className="space-y-4 mb-8">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-bold text-orange-900 mb-2">📋 Formato del examen:</h3>
              <ul className="text-orange-800 space-y-1 text-sm">
                <li>• 85 preguntas tipo test</li>
                <li>• 70 preguntas generales + 15 específicas</li>
                <li>• Tiempo límite: 120 minutos</li>
                <li>• Una sola oportunidad por pregunta</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-bold text-red-900 mb-2">⚠️ Condiciones:</h3>
              <ul className="text-red-800 space-y-1 text-sm">
                <li>• No se puede volver a preguntas anteriores</li>
                <li>• El tiempo se detiene solo al finalizar</li>
                <li>• Las respuestas se evalúan al terminar</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/dashboard" 
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 rounded-lg text-center transition-all"
            >
              Cancelar
            </Link>
            <button
              onClick={startExam}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all"
            >
              Comenzar Examen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100)
    const passed = percentage >= 50

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl">
          <div className="text-8xl text-center mb-6">{passed ? '🎉' : '😔'}</div>
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">
            {passed ? '¡Aprobado!' : 'No aprobado'}
          </h1>
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-gray-800 mb-2">{percentage}%</div>
            <p className="text-xl text-gray-600">
              {score} de {questions.length} correctas
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold text-gray-800 mb-4">📊 Desglose:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Correctas:</span>
                <span className="text-green-600 font-bold">{score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Incorrectas:</span>
                <span className="text-red-600 font-bold">{questions.length - Object.keys(answers).length - score + Object.keys(answers).length - score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">En blanco:</span>
                <span className="text-gray-600 font-bold">{questions.length - Object.keys(answers).length}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/dashboard" 
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 rounded-lg text-center transition-all"
            >
              Volver al Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all"
            >
              Repetir Examen
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con tiempo y progreso */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm text-gray-600">Pregunta</span>
              <span className="ml-2 text-2xl font-bold text-gray-800">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Tiempo restante</div>
              <div className={`text-2xl font-bold ${timeLeft < 600 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {currentQuestion.temaTitulo && (
            <div className="bg-orange-50 px-4 py-2 rounded-lg mb-4 inline-block">
              <span className="text-sm text-orange-800">
                Tema {currentQuestion.temaNumero}: {currentQuestion.temaTitulo}
              </span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const isSelected = answers[currentIndex] === letter
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(letter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-orange-100 border-orange-500'
                      : 'bg-gray-50 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <span className="font-semibold mr-3">{letter})</span>
                  {option}
                </button>
              )
            })}
          </div>

          <div className="flex gap-4">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                disabled={!answers[currentIndex]}
                className={`flex-1 font-bold py-4 rounded-lg transition-all ${
                  answers[currentIndex]
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Siguiente Pregunta →
              </button>
            ) : (
              <button
                onClick={finishExam}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all"
              >
                Finalizar Examen
              </button>
            )}
          </div>

          {!answers[currentIndex] && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Selecciona una respuesta para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
