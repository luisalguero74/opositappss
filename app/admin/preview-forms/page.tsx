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
}

interface Questionnaire {
  id: string
  title: string
  type: string
  published: boolean
  archived?: boolean
  questions: Question[]
  createdAt: string
}

export default function PreviewForms() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<Questionnaire | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [editForm, setEditForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadQuestionnaires()
  }, [])

  const loadQuestionnaires = async () => {
    try {
      const res = await fetch('/api/admin/questionnaires')
      if (res.ok) {
        const data = await res.json()
        setQuestionnaires(data)
        // limpiar selección si algunos ya no están
        setSelectedIds(prev => prev.filter(id => data.some((q: Questionnaire) => q.id === id)))
      }
    } catch (error) {
      console.error('Error loading questionnaires:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (id: string, publish: boolean) => {
    setPublishing(id)
    try {
      const res = await fetch(`/api/admin/questionnaires/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: publish })
      })

      if (res.ok) {
        await loadQuestionnaires()
        if (selectedQuiz?.id === id) {
          setSelectedQuiz({ ...selectedQuiz, published: publish })
        }
      }
    } catch (error) {
      console.error('Error publishing:', error)
    } finally {
      setPublishing(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cuestionario?')) return

    try {
      const res = await fetch(`/api/admin/questionnaires/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadQuestionnaires()
        if (selectedQuiz?.id === id) {
          setSelectedQuiz(null)
        }
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleRename = async (quiz: Questionnaire) => {
    const current = (quiz.title || '').trim()
    const nextTitle = prompt('Nuevo nombre del formulario/cuestionario:', current)
    if (!nextTitle) return
    const trimmed = nextTitle.trim()
    if (!trimmed || trimmed === current) return

    try {
      const res = await fetch(`/api/admin/questionnaires/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed })
      })

      if (!res.ok) {
        alert('Error al renombrar el formulario')
        return
      }

      await loadQuestionnaires()
      const updated = questionnaires.find((q) => q.id === quiz.id)
      if (updated) {
        setSelectedQuiz(updated)
      }
    } catch (error) {
      console.error('Error renaming questionnaire:', error)
      alert('Error de conexión al renombrar el formulario')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === questionnaires.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(questionnaires.map(q => q.id))
    }
  }

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'archive') => {
    if (selectedIds.length === 0 || bulkLoading) return

    if (action === 'archive') {
      const ok = confirm('¿Seguro que quieres archivar los cuestionarios seleccionados? No se eliminarán, solo se ocultarán de la lista.')
      if (!ok) return
    }

    setBulkLoading(true)
    try {
      const res = await fetch('/api/admin/questionnaires/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action })
      })

      if (res.ok) {
        await loadQuestionnaires()
        // si el seleccionado actual fue archivado, limpiarlo
        if (action === 'archive' && selectedQuiz && selectedIds.includes(selectedQuiz.id)) {
          setSelectedQuiz(null)
        }
        setSelectedIds([])
      } else {
        console.error('Error en acción masiva:', await res.text())
        alert('Error al aplicar la acción masiva')
      }
    } catch (error) {
      console.error('Error en acción masiva:', error)
      alert('Error de conexión en acción masiva')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setEditForm({
      text: question.text,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    })
  }

  const handleSaveQuestion = async () => {
    if (!editingQuestion || !selectedQuiz) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editForm.text,
          options: editForm.options,
          correctAnswer: editForm.correctAnswer,
          explanation: editForm.explanation
        })
      })

      if (res.ok) {
        await loadQuestionnaires()
        const updatedQuiz = questionnaires.find(q => q.id === selectedQuiz.id)
        if (updatedQuiz) {
          setSelectedQuiz(updatedQuiz)
        }
        setEditingQuestion(null)
      } else {
        alert('Error al guardar los cambios')
      }
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Cálculo seguro del índice de la opción correcta a partir de texto o letra A/B/C/D
  const getCurrentCorrectIndex = () => {
    // Intentar casar por texto completo
    const byText = editForm.options.findIndex(
      (opt) => opt.trim() === String(editForm.correctAnswer || '').trim()
    )
    if (byText >= 0) return byText

    // Si está guardado como letra (A, B, C o D), mapear a índice 0-3
    const raw = String(editForm.correctAnswer || '').trim().toUpperCase()
    if (['A', 'B', 'C', 'D'].includes(raw)) {
      const idx = raw.charCodeAt(0) - 65
      if (idx >= 0 && idx < editForm.options.length) return idx
    }

    // Fallback seguro
    return 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-2 inline-block">
                ← Volver al Panel de Administrador
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Vista Previa de Formularios</h1>
              <p className="text-gray-600 mt-1">Revisa y publica los cuestionarios creados</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de cuestionarios */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4 gap-3">
                <h2 className="text-xl font-bold text-gray-800">Cuestionarios ({questionnaires.length})</h2>
                {questionnaires.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={handleSelectAll}
                      checked={questionnaires.length > 0 && selectedIds.length === questionnaires.length}
                    />
                    <span>Seleccionar todos</span>
                  </label>
                )}
              </div>

              {/* Barra de acciones masivas */}
              {selectedIds.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex flex-col gap-2">
                  <div className="text-sm text-gray-700 font-semibold">
                    Seleccionados: {selectedIds.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleBulkAction('publish')}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {bulkLoading ? 'Aplicando...' : 'Publicar seleccionados'}
                    </button>
                    <button
                      onClick={() => handleBulkAction('unpublish')}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {bulkLoading ? 'Aplicando...' : 'Despublicar seleccionados'}
                    </button>
                    <button
                      onClick={() => handleBulkAction('archive')}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {bulkLoading ? 'Aplicando...' : 'Archivar seleccionados'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {questionnaires.map((quiz) => {
                  const isSelected = selectedIds.includes(quiz.id)

                  return (
                    <div
                      key={quiz.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedQuiz?.id === quiz.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedQuiz(quiz)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-gray-300 flex-shrink-0"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleSelect(quiz.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {quiz.type === 'theory' ? '📘 Teoría' : '📗 Práctico'} · {quiz.questions.length} preguntas
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(quiz.createdAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                        <div>
                          {quiz.published ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              Publicado
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                              Borrador
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {questionnaires.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No hay cuestionarios creados</p>
                )}
              </div>
            </div>
          </div>

          {/* Vista previa del cuestionario */}
          <div className="lg:col-span-2">
            {selectedQuiz ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                {/* Header del cuestionario */}
                <div className="mb-6 pb-4 border-b flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedQuiz.title}</h2>
                    <p className="text-gray-600 mt-1">
                      {selectedQuiz.type === 'theory' ? '📘 Teoría' : '📗 Práctico'} · {selectedQuiz.questions.length} preguntas
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRename(selectedQuiz)}
                      className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg hover:bg-blue-200"
                    >
                      ✏️ Renombrar formulario
                    </button>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 mb-6">
                  {selectedQuiz.published ? (
                    <button
                      onClick={() => handlePublish(selectedQuiz.id, false)}
                      disabled={publishing === selectedQuiz.id}
                      className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                    >
                      {publishing === selectedQuiz.id ? 'Despublicando...' : '📝 Despublicar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublish(selectedQuiz.id, true)}
                      disabled={publishing === selectedQuiz.id}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {publishing === selectedQuiz.id ? 'Publicando...' : '✓ Publicar en ' + (selectedQuiz.type === 'theory' ? 'Teoría' : 'Prácticos')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedQuiz.id)}
                    className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                  >
                    🗑️ Eliminar
                  </button>
                </div>

                {/* Preguntas con el mismo diseño que el quiz real */}
                <div className="space-y-6">
                  {selectedQuiz.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200"
                    >
                      {/* Botón editar en la esquina */}
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                          ✏️ Editar
                        </button>
                      </div>

                      {/* Pregunta */}
                      <div className="mb-4">
                        <span className="text-blue-600 font-semibold mr-2">PREGUNTA {index + 1}:</span>
                        <span className="text-lg font-bold text-gray-900">{question.text}</span>
                      </div>

                      {/* Opciones */}
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => {
                          const optionLetter = String.fromCharCode(97 + optIndex)
                          const isCorrect = option === question.correctAnswer

                          return (
                            <div
                              key={optIndex}
                              className={`p-4 rounded-lg border-2 ${
                                isCorrect
                                  ? 'bg-green-50 border-green-400'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-700 mr-2">
                                    OPCIÓN {optionLetter.toUpperCase()}:
                                  </span>
                                  <span className="text-gray-900">{option}</span>
                                  {isCorrect && (
                                    <span className="ml-2 text-green-700 font-semibold">✓ Correcta</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Explicación */}
                      <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="font-semibold text-gray-700 mb-2">MOTIVACIÓN:</div>
                        <p className="text-gray-800">{question.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Selecciona un cuestionario
                </h3>
                <p className="text-gray-600">
                  Elige un cuestionario de la lista para ver su vista previa
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900">Editar Pregunta</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Texto de la pregunta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Texto de la Pregunta
                </label>
                <textarea
                  value={editForm.text}
                  onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Escribe la pregunta..."
                />
              </div>

              {/* Opciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opciones de Respuesta
                </label>
                <div className="space-y-3">
                  {editForm.options.map((option, index) => (
                    <div key={index}>
                      <label className="block text-xs text-gray-600 mb-1">
                        Opción {String.fromCharCode(65 + index)}
                      </label>
                      <textarea
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...editForm.options]
                          newOptions[index] = e.target.value
                          setEditForm({ ...editForm, options: newOptions })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder={`Opción ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Respuesta correcta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Respuesta Correcta
                </label>
                <select
                  value={getCurrentCorrectIndex().toString()}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10)
                    const option = editForm.options[idx] || ''
                    setEditForm({
                      ...editForm,
                      correctAnswer: option
                    })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {editForm.options.map((option, index) => (
                    <option key={index} value={index.toString()}>
                      {`Opción ${String.fromCharCode(65 + index)}${option ? `: ${option.substring(0, 80)}` : ''}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  La opción seleccionada se guardará como respuesta correcta y será coherente con las opciones de arriba.
                </p>
              </div>

              {/* Explicación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Explicación / Motivación
                </label>
                <textarea
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Explica por qué esta es la respuesta correcta..."
                />
              </div>
            </div>

            {/* Botones del modal */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setEditingQuestion(null)}
                disabled={saving}
                className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : '✓ Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
