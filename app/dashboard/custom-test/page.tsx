'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Topic {
  id: string
  topic: string
  count: number
}

export default function CustomTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [generalTopics, setGeneralTopics] = useState<Topic[]>([])
  const [specificTopics, setSpecificTopics] = useState<Topic[]>([])
  const [selectedGeneral, setSelectedGeneral] = useState<string[]>([])
  const [selectedSpecific, setSelectedSpecific] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [difficulty, setDifficulty] = useState<'todas' | 'facil' | 'media' | 'dificil'>('todas')
  const [loading, setLoading] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    loadAvailableTopics()
  }, [])

  const loadAvailableTopics = async () => {
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/custom-test/topics')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const general = data.filter((t: any) => t.id.toLowerCase().startsWith('g'))
          const specific = data.filter((t: any) => t.id.toLowerCase().startsWith('e'))
          setGeneralTopics(general)
          setSpecificTopics(specific)
        } else {
          setGeneralTopics(Array.isArray(data?.general) ? data.general : Array.isArray(data?.all) ? data.all.filter((t: any) => t.id.toLowerCase().startsWith('g')) : [])
          setSpecificTopics(Array.isArray(data?.specific) ? data.specific : Array.isArray(data?.all) ? data.all.filter((t: any) => t.id.toLowerCase().startsWith('e')) : [])
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error)
    } finally {
      setLoadingTopics(false)
    }
  }

  const toggleTopic = (topic: string, type: 'general' | 'specific') => {
    if (type === 'general') {
      setSelectedGeneral(prev =>
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      )
    } else {
      setSelectedSpecific(prev =>
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      )
    }
  }

  const selectAllGeneral = () => {
    setSelectedGeneral(generalTopics.map(t => t.id))
  }

  const selectAllSpecific = () => {
    setSelectedSpecific(specificTopics.map(t => t.id))
  }

  const clearAll = () => {
    setSelectedGeneral([])
    setSelectedSpecific([])
  }

  const handleCreateTest = async () => {
    if (selectedGeneral.length === 0 && selectedSpecific.length === 0) {
      alert('Debes seleccionar al menos un tema')
      return
    }

    if (questionCount < 5 || questionCount > 100) {
      alert('El número de preguntas debe estar entre 5 y 100')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/custom-test/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generalTopics: selectedGeneral,
          specificTopics: selectedSpecific,
          questionCount,
          difficulty
        })
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/quiz/${data.questionnaireId}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al crear el test')
      }
    } catch (error) {
      alert('Error al crear el test')
    } finally {
      setLoading(false)
    }
  }

  const totalAvailable = 
    generalTopics.filter(t => selectedGeneral.includes(t.id)).reduce((sum, t) => sum + t.count, 0) +
    specificTopics.filter(t => selectedSpecific.includes(t.id)).reduce((sum, t) => sum + t.count, 0)

  // Calcular distribución de preguntas
  const hasGeneral = selectedGeneral.length > 0
  const hasSpecific = selectedSpecific.length > 0
  const generalQuestionsCount = hasGeneral && hasSpecific ? Math.round(questionCount * 0.4) : (hasGeneral ? questionCount : 0)
  const specificQuestionsCount = hasGeneral && hasSpecific ? (questionCount - generalQuestionsCount) : (hasSpecific ? questionCount : 0)

  if (status === 'loading' || loadingTopics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold text-white">Test a la Carta</h1>
              <p className="text-blue-100 mt-2">Crea tu propio test personalizado eligiendo temas y número de preguntas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuración */}
          <div className="lg:col-span-2 space-y-6">
            {/* Temario General */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">📚 Temario General</h2>
                <button
                  onClick={selectAllGeneral}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Seleccionar todos
                </button>
              </div>
              {generalTopics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay temas disponibles del temario general</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {generalTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id, 'general')}
                      className={`p-4 rounded-lg border-2 transition ${
                        selectedGeneral.includes(topic.id)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">{topic.topic}</div>
                      <div className="text-xs text-gray-500 mt-1">{topic.count} preguntas</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Temario Específico */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">🎓 Temario Específico</h2>
                <button
                  onClick={selectAllSpecific}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Seleccionar todos
                </button>
              </div>
              {specificTopics.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay temas disponibles del temario específico</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specificTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id, 'specific')}
                      className={`p-4 rounded-lg border-2 transition ${
                        selectedSpecific.includes(topic.id)
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-green-300 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">{topic.topic}</div>
                      <div className="text-xs text-gray-500 mt-1">{topic.count} preguntas</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Resumen</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de preguntas
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 20)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Entre 5 y 100 preguntas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de dificultad
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="todas">Todas las dificultades</option>
                    <option value="facil">🟢 Fácil</option>
                    <option value="media">🟡 Media</option>
                    <option value="dificil">🔴 Difícil</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Filtra preguntas por nivel</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Temas generales:</span>
                    <span className="font-semibold text-blue-600">{selectedGeneral.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Temas específicos:</span>
                    <span className="font-semibold text-green-600">{selectedSpecific.length}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span className="text-gray-800">Total temas:</span>
                    <span className="text-indigo-600">{selectedGeneral.length + selectedSpecific.length}</span>
                  </div>
                  
                  {/* Mostrar distribución si hay ambos tipos */}
                  {hasGeneral && hasSpecific && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3 border border-blue-200">
                      <p className="text-xs font-semibold text-blue-800 mb-2">📊 Distribución de preguntas:</p>
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>Generales (40%):</span>
                        <span className="font-bold">{generalQuestionsCount}</span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>Específicas (60%):</span>
                        <span className="font-bold">{specificQuestionsCount}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Preguntas disponibles:</span>
                    <span className={`font-semibold ${totalAvailable >= questionCount ? 'text-green-600' : 'text-red-600'}`}>
                      {totalAvailable}
                    </span>
                  </div>
                </div>
              </div>

              {totalAvailable < questionCount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ No hay suficientes preguntas disponibles. Selecciona más temas o reduce el número de preguntas.
                  </p>
                </div>
              )}

              <button
                onClick={handleCreateTest}
                disabled={loading || (selectedGeneral.length === 0 && selectedSpecific.length === 0) || totalAvailable < questionCount}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {loading ? '⏳ Creando test...' : '🚀 Crear Test'}
              </button>

              {(selectedGeneral.length > 0 || selectedSpecific.length > 0) && (
                <button
                  onClick={clearAll}
                  className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition"
                >
                  🗑️ Limpiar selección
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
