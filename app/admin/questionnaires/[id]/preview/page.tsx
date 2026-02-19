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
  category?: string // 'general' o 'especifico'
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
  const [publishing, setPublishing] = useState(false)
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
        setCategory(data.questionnaire.category || inferCategoryFromQuestions(data.questions))
      }
    } catch (error) {
      console.error('Error loading questionnaire:', error)
    } finally {
      setLoading(false)
    }
  }

  const inferCategoryFromQuestions = (questions: Question[]): 'general' | 'especifico' => {
    // Inferir categoría desde el temaCodigo de la primera pregunta
    if (questions.length > 0 && questions[0].temaCodigo) {
      return questions[0].temaCodigo.startsWith('G') ? 'general' : 'especifico'
    }
    return 'general'
  }

  const handlePublish = async () => {
    if (!confirm(`¿Publicar este cuestionario como "${category === 'general' ? 'GENERAL' : 'ESPECÍFICO'}"?`)) {
      return
    }

    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      })

      if (res.ok) {
        alert('✅ Cuestionario publicado correctamente')
        loadQuestionnaire()
      } else {
        alert('❌ Error al publicar')
      }
    } catch (error) {
      alert('❌ Error al publicar')
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('¿Despublicar este cuestionario?')) {
      return
    }

    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/unpublish`, {
        method: 'POST'
      })

      if (res.ok) {
        alert('✅ Cuestionario despublicado')
        loadQuestionnaire()
      } else {
        alert('❌ Error al despublicar')
      }
    } catch (error) {
      alert('❌ Error al despublicar')
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este cuestionario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Cuestionario eliminado')
        router.push('/admin')
      } else {
        alert('❌ Error al eliminar')
      }
    } catch (error) {
      alert('❌ Error al eliminar')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando vista previa...</p>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Cuestionario no encontrado</p>
          <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Volver al panel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-blue-600 hover:underline mb-2 inline-block">
              ← Volver al panel
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📋 Vista Previa del Cuestionario
            </h1>
            <h2 className="text-2xl text-gray-700">{questionnaire.title}</h2>
          </div>
        </div>

        {/* Estado y Acciones */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-6xl">
                {questionnaire.published ? '✅' : '📝'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    questionnaire.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {questionnaire.published ? 'PUBLICADO' : 'BORRADOR'}
                  </span>
                  <span className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    category === 'general'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {category === 'general' ? '📗 GENERAL' : '📘 ESPECÍFICO'}
                  </span>
                </div>
                <p className="text-gray-600">
                  {questionnaire._count.questionnaireQuestions} preguntas
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!questionnaire.published ? (
                <>
                  {/* Selector de categoría */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Categoría:</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as 'general' | 'especifico')}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="general">📗 General (Verde)</option>
                      <option value="especifico">📘 Específico (Azul)</option>
                    </select>
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                  >
                    {publishing ? '⏳ Publicando...' : '✅ Publicar Cuestionario'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleUnpublish}
                  disabled={publishing}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50"
                >
                  {publishing ? '⏳ Despublicando...' : '📝 Despublicar'}
                </button>
              )}
              <button
                onClick={() => router.push(`/admin/questionnaires/${questionnaireId}/edit`)}
                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
              >
                ✏️ Editar
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* Preguntas */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Preguntas ({questions.length})
          </h3>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-gray-900 flex-1">
                    {index + 1}. {q.text}
                  </h4>
                  <div className="flex gap-2 ml-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                      {q.temaCodigo}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                      {q.difficulty || 'media'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded ${
                        String.fromCharCode(65 + i) === q.correctAnswer
                          ? 'bg-green-100 border-2 border-green-400 font-semibold'
                          : 'bg-gray-50'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}) {opt}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Explicación:</strong> {q.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
