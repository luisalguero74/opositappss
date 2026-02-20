'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  difficulty: string
  temaCodigo: string
}

interface Questionnaire {
  id: string
  title: string
  type: string
  published: boolean
  category?: string
  _count: {
    questionnaireQuestions: number
  }
}

export default function QuestionnairePreviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const questionnaireId = params.id as string

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [category, setCategory] = useState<'general' | 'especifico'>('general')

  useEffect(() => {
    if (status === 'authenticated') {
      loadQuestionnaire()
    }
  }, [status, questionnaireId])

  const loadQuestionnaire = async () => {
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/preview`)
      if (res.ok) {
        const data = await res.json()
        setQuestionnaire(data.questionnaire)
        setQuestions(data.questions)
        
        // Inferir categoría si no está establecida
        const inferredCategory = data.questionnaire.category || 
          (data.questions.length > 0 && data.questions[0].temaCodigo?.startsWith('G') ? 'general' : 'especifico')
        setCategory(inferredCategory as 'general' | 'especifico')
      } else {
        alert('Error al cargar el cuestionario')
        router.push('/admin/questionnaires/manage')
      }
    } catch (error) {
      console.error('Error loading questionnaire:', error)
      alert('Error de conexión')
      router.push('/admin/questionnaires/manage')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (questions.length === 0) {
      alert('⚠️ No se puede publicar un cuestionario sin preguntas')
      return
    }

    const categoryText = category === 'general' ? '📗 GENERAL (Verde)' : '📘 ESPECÍFICO (Azul)'
    if (!confirm(`¿Publicar este cuestionario como "${categoryText}"?\n\n${questions.length} preguntas se publicarán.`)) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true, category })
      })

      if (res.ok) {
        alert('✅ Cuestionario publicado correctamente')
        await loadQuestionnaire()
      } else {
        const error = await res.json()
        alert(`❌ Error al publicar: ${error.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('¿Despublicar este cuestionario?\n\nVolverá al estado de borrador.')) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/unpublish`, {
        method: 'POST'
      })

      if (res.ok) {
        alert('✅ Cuestionario despublicado')
        await loadQuestionnaire()
      } else {
        alert('❌ Error al despublicar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE este cuestionario?\n\n"${questionnaire?.title}"\n\nEsta acción NO se puede deshacer.`)) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Cuestionario eliminado')
        router.push('/admin/questionnaires/manage')
      } else {
        alert('❌ Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const styles: Record<string, string> = {
      facil: 'bg-green-100 text-green-800',
      media: 'bg-yellow-100 text-yellow-800',
      dificil: 'bg-red-100 text-red-800',
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    }
    const style = styles[difficulty.toLowerCase()] || 'bg-gray-100 text-gray-800'
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${style}`}>{difficulty}</span>
  }

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      theory: { label: '📚 Teoría', color: 'bg-purple-100 text-purple-800' },
      practice: { label: '⚡ Práctica', color: 'bg-orange-100 text-orange-800' },
      simulation: { label: '🎯 Simulación', color: 'bg-red-100 text-red-800' },
      mixed: { label: '🔀 Mixto', color: 'bg-indigo-100 text-indigo-800' }
    }
    const typeInfo = types[type] || { label: type, color: 'bg-gray-100 text-gray-800' }
    return <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando vista previa...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    router.push('/dashboard')
    return null
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cuestionario no encontrado</h2>
          <p className="text-gray-600 mb-4">El cuestionario que buscas no existe o fue eliminado.</p>
          <Link 
            href="/admin/questionnaires/manage" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            ← Volver a Gestión de Cuestionarios
          </Link>
        </div>
      </div>
    )
  }

  const isEmpty = questions.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href="/admin/questionnaires/manage" 
                className="text-white hover:text-blue-100 text-sm font-medium mb-2 inline-flex items-center gap-1"
              >
                ← Volver a Gestión
              </Link>
              <h1 className="text-3xl font-bold text-white mt-1">📋 Vista Previa del Cuestionario</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Información del Cuestionario */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{questionnaire.title}</h2>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  questionnaire.published 
                    ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                    : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500'
                }`}>
                  {questionnaire.published ? '✅ PUBLICADO' : '📝 BORRADOR'}
                </span>
                
                {getTypeBadge(questionnaire.type)}
                
                <span className={`px-4 py-2 rounded-lg font-bold text-sm border-2 ${
                  category === 'general'
                    ? 'bg-green-100 text-green-800 border-green-500'
                    : 'bg-blue-100 text-blue-800 border-blue-500'
                }`}>
                  {category === 'general' ? '📗 GENERAL' : '📘 ESPECÍFICO'}
                </span>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{isEmpty ? '⚠️' : '📝'}</div>
                  <div>
                    <p className={`text-2xl font-bold ${isEmpty ? 'text-red-600' : 'text-blue-600'}`}>
                      {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
                    </p>
                    {isEmpty && <p className="text-red-600 text-sm font-semibold">¡Cuestionario vacío!</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Acciones */}
            <div className="ml-6 flex flex-col gap-3 min-w-[200px]">
              {!questionnaire.published && !isEmpty && (
                <>
                  <div className="mb-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Categoría al publicar:
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'general' | 'especifico')}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="general">📗 General (Verde)</option>
                      <option value="especifico">📘 Específico (Azul)</option>
                    </select>
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={processing}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? '⏳ Publicando...' : '✅ Publicar Ahora'}
                  </button>
                </>
              )}
              
              {questionnaire.published && (
                <button
                  onClick={handleUnpublish}
                  disabled={processing}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-700 shadow-lg transition disabled:opacity-50"
                >
                  {processing ? '⏳ ...' : '📝 Despublicar'}
                </button>
              )}
              
              <button
                onClick={handleDelete}
                disabled={processing}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg transition disabled:opacity-50"
              >
                {processing ? '⏳ ...' : '🗑️ Eliminar'}
              </button>

              <Link
                href="/admin/questionnaires/manage"
                className="px-6 py-3 bg-gray-500 text-white text-center font-bold rounded-lg hover:bg-gray-600 shadow-lg transition"
              >
                ← Cancelar
              </Link>
            </div>
          </div>
        </div>

        {/* Lista de Preguntas */}
        {isEmpty ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border-4 border-red-400">
            <div className="text-8xl mb-4">⚠️</div>
            <h3 className="text-3xl font-bold text-red-600 mb-2">Cuestionario Vacío</h3>
            <p className="text-gray-600 text-lg">Este cuestionario no tiene preguntas asignadas.</p>
            <p className="text-gray-500 mt-2">Agrega preguntas antes de publicar.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Preguntas del Cuestionario ({questions.length})
              </h3>
              <p className="text-sm text-gray-500">
                La respuesta correcta está marcada en <span className="text-green-600 font-semibold">verde</span>
              </p>
            </div>
            
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div 
                  key={q.id} 
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition"
                >
                  {/* Encabezado de la pregunta */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                          #{index + 1}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
                          {q.temaCodigo}
                        </span>
                        {getDifficultyBadge(q.difficulty)}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 leading-relaxed">
                        {q.text}
                      </h4>
                    </div>
                  </div>

                  {/* Opciones de respuesta */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, i) => {
                      const optionLetter = String.fromCharCode(65 + i)
                      const isCorrect = optionLetter === q.correctAnswer
                      
                      return (
                        <div
                          key={i}
                          className={`px-4 py-3 rounded-lg transition ${
                            isCorrect
                              ? 'bg-green-100 border-2 border-green-500 font-semibold shadow-md'
                              : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrect && <span className="text-green-600 text-xl">✓</span>}
                            <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                              {optionLetter})
                            </span>
                            <span className={isCorrect ? 'text-green-900' : 'text-gray-800'}>
                              {opt}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Explicación */}
                  {q.explanation && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 text-xl flex-shrink-0">💡</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Explicación:</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
