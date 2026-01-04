'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FailedQuestion {
  questionId: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  temaCodigo?: string
  temaNumero?: number
  temaTitulo?: string
  difficulty?: string
  questionnaire: { title: string, type: string }
  timesFailed: number
  lastFailed: string
}

export default function FailedQuestionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<FailedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchFailedQuestions()
    }
  }, [status, router])

  const fetchFailedQuestions = async () => {
    try {
      const res = await fetch('/api/user/failed-questions')
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

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-red-600 hover:text-red-700 font-semibold mb-4 inline-block">
          ← Volver
        </Link>
        
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">❌ Preguntas Falladas</h1>
              <p className="text-red-100">Repasa y mejora con {questions.length} preguntas</p>
            </div>
            <div className="text-6xl">🎯</div>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Perfecto!</h2>
            <p className="text-gray-600">No has fallado ninguna pregunta todavía</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.questionId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-200">
                  <div>
                    <span className="text-red-600 font-bold">#{index + 1}</span>
                    {q.temaTitulo && (
                      <span className="ml-4 text-sm text-gray-600">
                        Tema {q.temaNumero}: {q.temaTitulo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Fallada {q.timesFailed}x
                    </span>
                    <button
                      onClick={() => setSelectedQuestion(selectedQuestion === q.questionId ? null : q.questionId)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      {selectedQuestion === q.questionId ? '▲ Ocultar' : '▼ Ver respuesta'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-lg text-gray-800 mb-4 font-medium">{q.text}</p>
                  
                  <div className="space-y-2 mb-4">
                    {q.options.map((option, i) => {
                      const letter = ['A', 'B', 'C', 'D'][i]
                      const isCorrect = letter === q.correctAnswer
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border-2 ${
                            selectedQuestion === q.questionId && isCorrect
                              ? 'bg-green-50 border-green-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <span className="font-semibold mr-2">{letter})</span>
                          {option}
                          {selectedQuestion === q.questionId && isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correcta</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {selectedQuestion === q.questionId && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="font-semibold text-blue-900 mb-2">📝 Explicación:</p>
                      <p className="text-blue-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
