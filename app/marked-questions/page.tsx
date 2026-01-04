'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MarkedQuestion {
  id: string
  type: string
  notes?: string
  markedAt: string
  question: {
    id: string
    text: string
    options: string[]
    correctAnswer: string
    explanation: string
    difficulty?: string
  }
}

export default function MarkedQuestionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<MarkedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchMarkedQuestions()
    }
  }, [status, router, filter])

  const fetchMarkedQuestions = async () => {
    try {
      const url = filter 
        ? `/api/user/marked-questions?type=${filter}`
        : '/api/user/marked-questions'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.marked || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const unmarkQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/user/marked-questions?questionId=${questionId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setQuestions(questions.filter(q => q.question.id !== questionId))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'doubt': return '🤔'
      case 'review': return '📚'
      case 'important': return '⭐'
      default: return '📌'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'doubt': return 'Duda'
      case 'review': return 'Repasar'
      case 'important': return 'Importante'
      default: return type
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
          ← Volver
        </Link>
        
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📌 Preguntas Marcadas</h1>
              <p className="text-purple-100">{questions.length} preguntas guardadas</p>
            </div>
            <div className="text-6xl">🎯</div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === null
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-purple-600 hover:bg-purple-50'
            }`}
          >
            Todas ({questions.length})
          </button>
          <button
            onClick={() => setFilter('doubt')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'doubt'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-white text-yellow-600 hover:bg-yellow-50'
            }`}
          >
            🤔 Dudas
          </button>
          <button
            onClick={() => setFilter('review')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'review'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            📚 Repasar
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'important'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-orange-600 hover:bg-orange-50'
            }`}
          >
            ⭐ Importantes
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No hay preguntas marcadas</h2>
            <p className="text-gray-600">Marca preguntas durante el estudio para repasarlas después</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-purple-50 px-6 py-4 flex items-center justify-between border-b border-purple-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(q.type)}</span>
                    <span className="text-purple-600 font-bold">#{index + 1}</span>
                    <span className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {getTypeLabel(q.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedQuestion(selectedQuestion === q.question.id ? null : q.question.id)}
                      className="text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      {selectedQuestion === q.question.id ? '▲ Ocultar' : '▼ Ver respuesta'}
                    </button>
                    <button
                      onClick={() => unmarkQuestion(q.question.id)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      ✕ Eliminar
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-lg text-gray-800 mb-4 font-medium">{q.question.text}</p>
                  
                  {q.notes && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
                      <p className="text-sm text-yellow-800">💡 <strong>Nota:</strong> {q.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {q.question.options.map((option, i) => {
                      const letter = ['A', 'B', 'C', 'D'][i]
                      const isCorrect = letter === q.question.correctAnswer
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border-2 ${
                            selectedQuestion === q.question.id && isCorrect
                              ? 'bg-green-50 border-green-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <span className="font-semibold mr-2">{letter})</span>
                          {option}
                          {selectedQuestion === q.question.id && isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correcta</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {selectedQuestion === q.question.id && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="font-semibold text-blue-900 mb-2">📝 Explicación:</p>
                      <p className="text-blue-800">{q.question.explanation}</p>
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
