'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Card {
  question: {
    id: string
    text: string
    options: string[]
    correctAnswer: string
    explanation: string
  }
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
}

export default function SpacedRepetitionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewComplete, setReviewComplete] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchCards()
    }
  }, [status, router])

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/user/spaced-repetition')
      if (res.ok) {
        const data = await res.json()
        setCards(data.cards || [])
        if ((data.cards || []).length === 0) {
          setReviewComplete(true)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuality = async (quality: number) => {
    try {
      const res = await fetch('/api/user/spaced-repetition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: cards[currentIndex].question.id,
          quality
        })
      })

      if (res.ok) {
        if (currentIndex + 1 >= cards.length) {
          setReviewComplete(true)
        } else {
          setCurrentIndex(currentIndex + 1)
          setShowAnswer(false)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
    </div>
  }

  if (reviewComplete || cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">¡Todo repasado!</h1>
          <p className="text-gray-600 mb-8">
            {cards.length === 0 
              ? 'No hay tarjetas pendientes de repaso'
              : 'Has completado todas las tarjetas de hoy'
            }
          </p>
          <Link 
            href="/dashboard" 
            className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all inline-block"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold mb-4 inline-block">
          ← Volver
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">🧠 Repetición Espaciada</h1>
              <span className="text-lg font-semibold">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>
            <div className="w-full bg-indigo-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Repetición #{currentCard.repetitions + 1} · 
                Intervalo actual: {currentCard.interval} días
              </p>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {currentCard.question.text}
              </h2>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all"
                >
                  Mostrar Respuesta
                </button>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {currentCard.question.options.map((option, i) => {
                      const letter = ['A', 'B', 'C', 'D'][i]
                      const isCorrect = letter === currentCard.question.correctAnswer
                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-lg border-2 ${
                            isCorrect
                              ? 'bg-green-50 border-green-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <span className="font-semibold mr-2">{letter})</span>
                          {option}
                          {isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correcta</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                    <p className="font-semibold text-blue-900 mb-2">📝 Explicación:</p>
                    <p className="text-blue-800">{currentCard.question.explanation}</p>
                  </div>

                  <div className="border-t pt-6">
                    <p className="text-center text-gray-700 font-semibold mb-4">
                      ¿Qué tan bien recordaste esta respuesta?
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      <button
                        onClick={() => handleQuality(0)}
                        className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        0<br/>
                        <span className="text-xs">No recordé</span>
                      </button>
                      <button
                        onClick={() => handleQuality(1)}
                        className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        1<br/>
                        <span className="text-xs">Difícil</span>
                      </button>
                      <button
                        onClick={() => handleQuality(3)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        3<br/>
                        <span className="text-xs">Bien</span>
                      </button>
                      <button
                        onClick={() => handleQuality(4)}
                        className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        4<br/>
                        <span className="text-xs">Fácil</span>
                      </button>
                      <button
                        onClick={() => handleQuality(5)}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        5<br/>
                        <span className="text-xs">Muy fácil</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
