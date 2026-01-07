'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  options: string
  correctAnswer: string
  explanation: string
  temaCodigo: string | null
  temaNumero: number | null
  temaParte: string | null
  temaTitulo: string | null
  difficulty: string | null
  questionnaireId: string
  questionnaire: {
    id: string
    title: string
    published: boolean
  }
}

export default function QuestionsReview() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [filter, setFilter] = useState<'all' | 'general' | 'especifico'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'facil' | 'media' | 'dificil'>('all')
  const [selectedTemas, setSelectedTemas] = useState<number[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [creatingQuestionnaire, setCreatingQuestionnaire] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      loadQuestions()
    }
  }, [status, session, router])

  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions-review')
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error cargando preguntas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditData({
      text: question.text,
      options: JSON.parse(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty
    })
  }

  const handleSave = async (id: string) => {
    try {
      const res = await fetch('/api/admin/questions-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...editData,
          options: JSON.stringify(editData.options)
        })
      })

      if (res.ok) {
        setEditingId(null)
        loadQuestions()
      }
    } catch (error) {
      console.error('Error guardando:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return

    try {
      const res = await fetch('/api/admin/questions-review', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        loadQuestions()
      }
    } catch (error) {
      console.error('Error eliminando:', error)
    }
  }

  const handlePublish = async (questionnaireId: string) => {
    if (!confirm('¿Publicar este cuestionario? Los usuarios podrán verlo.')) return

    try {
      const res = await fetch('/api/admin/questionnaires/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaireId, published: true })
      })

      if (res.ok) {
        loadQuestions()
        alert('✅ Cuestionario publicado')
      }
    } catch (error) {
      console.error('Error publicando:', error)
    }
  }

  // Obtener lista única de temas según el filtro de categoría
  const availableTemas = useMemo(() => {
    const temas = new Map<number, string>()
    questions
      .filter(q => filter === 'all' || q.temaParte?.toLowerCase() === filter)
      .forEach(q => {
        if (q.temaNumero !== null && q.temaTitulo) {
          temas.set(q.temaNumero, q.temaTitulo)
        }
      })
    return Array.from(temas.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, titulo]) => ({ numero: num, titulo }))
  }, [questions, filter])

  const filteredQuestions = questions.filter(q => {
    if (filter !== 'all' && q.temaParte?.toLowerCase() !== filter) return false
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false
    if (selectedTemas.length > 0 && !selectedTemas.includes(q.temaNumero || -1)) return false
    return true
  })

  const questionsByQuestionnaire = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.questionnaireId]) {
      acc[q.questionnaireId] = {
        questionnaire: q.questionnaire,
        questions: []
      }
    }
    acc[q.questionnaireId].questions.push(q)
    return acc
  }, {} as Record<string, { questionnaire: any, questions: Question[] }>)

  const handleToggleQuestion = (id: string) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedQuestions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))
    }
  }

  const handleToggleTema = (temaNum: number) => {
    setSelectedTemas(prev => 
      prev.includes(temaNum) 
        ? prev.filter(t => t !== temaNum)
        : [...prev, temaNum]
    )
  }

  const handleSelectAllTemas = () => {
    if (selectedTemas.length === availableTemas.length) {
      setSelectedTemas([])
    } else {
      setSelectedTemas(availableTemas.map(t => t.numero))
    }
  }

  const handleCreateQuestionnaireFromSelected = async () => {
    if (selectedQuestions.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }

    const title = prompt(`Nombre del cuestionario (${selectedQuestions.size} preguntas):`)
    if (!title) return

    setCreatingQuestionnaire(true)
    try {
      const res = await fetch('/api/admin/questionnaires/from-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          questionIds: Array.from(selectedQuestions)
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert(`✅ Cuestionario "${title}" creado con ${selectedQuestions.size} preguntas`)
        setSelectedQuestions(new Set())
        loadQuestions()
      } else {
        alert(`Error: ${data.error || 'No se pudo crear el cuestionario'}`)
      }
    } catch (error) {
      console.error('Error creando cuestionario:', error)
      alert('Error al crear cuestionario')
    } finally {
      setCreatingQuestionnaire(false)
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando preguntas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block font-semibold">
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📋 Revisar y Gestionar Preguntas</h1>
          <p className="text-gray-600">Edita, elimina y publica cuestionarios generados</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Categoría:</label>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as any)
                  setSelectedTemas([])
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="general">Temario General</option>
                <option value="especifico">Temario Específico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Dificultad:</label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preguntas mostradas: {filteredQuestions.length}
                </label>
                <div className="text-sm text-gray-600">
                  Seleccionadas: {selectedQuestions.size}
                </div>
              </div>
            </div>
          </div>

          {/* Filtro de Temas */}
          {availableTemas.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Filtrar por Tema ({filter === 'general' ? 'General' : filter === 'especifico' ? 'Específico' : 'Todos'}):
                </label>
                <button
                  onClick={handleSelectAllTemas}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {selectedTemas.length === availableTemas.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {availableTemas.map(tema => (
                  <label key={tema.numero} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTemas.includes(tema.numero)}
                      onChange={() => handleToggleTema(tema.numero)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      Tema {tema.numero}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Acciones de selección masiva */}
          {filteredQuestions.length > 0 && (
            <div className="mt-4 pt-4 border-t flex gap-3 flex-wrap">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
              >
                {selectedQuestions.size === filteredQuestions.length ? '☑️ Deseleccionar todas' : '☐ Seleccionar todas'}
              </button>
              <button
                onClick={handleCreateQuestionnaireFromSelected}
                disabled={selectedQuestions.size === 0 || creatingQuestionnaire}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                {creatingQuestionnaire ? '⏳ Creando...' : `📝 Crear Cuestionario (${selectedQuestions.size})`}
              </button>
            </div>
          )}
        </div>

        {/* Cuestionarios */}
        {Object.entries(questionsByQuestionnaire).map(([qId, { questionnaire, questions }]) => (
          <div key={qId} className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{questionnaire.title}</h2>
                <p className="text-gray-600">{questions.length} preguntas</p>
              </div>
              <div className="flex gap-3">
                {!questionnaire.published && (
                  <button
                    onClick={() => handlePublish(qId)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    ✅ Publicar Cuestionario
                  </button>
                )}
                {questionnaire.published && (
                  <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                    ✅ Publicado
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border-2 border-gray-200 rounded-lg p-4">
                  {editingId === q.id ? (
                    /* Modo Edición */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Pregunta:</label>
                        <textarea
                          value={editData.text}
                          onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={3}
                        />
                      </div>
                      {[0, 1, 2, 3].map(i => (
                        <div key={i}>
                          <label className="block text-sm font-semibold mb-2">Opción {String.fromCharCode(65 + i)}:</label>
                          <input
                            value={editData.options[i]}
                            onChange={(e) => {
                              const newOptions = [...editData.options]
                              newOptions[i] = e.target.value
                              setEditData({ ...editData, options: newOptions })
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">Respuesta Correcta:</label>
                          <select
                            value={editData.correctAnswer}
                            onChange={(e) => setEditData({ ...editData, correctAnswer: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">Dificultad:</label>
                          <select
                            value={editData.difficulty}
                            onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="facil">Fácil</option>
                            <option value="media">Media</option>
                            <option value="dificil">Difícil</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Explicación:</label>
                        <textarea
                          value={editData.explanation}
                          onChange={(e) => setEditData({ ...editData, explanation: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSave(q.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          💾 Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo Vista */
                    <div className="flex items-start gap-3">
                      {/* Checkbox de selección */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.has(q.id)}
                          onChange={() => handleToggleQuestion(q.id)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Seleccionar pregunta"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-semibold text-blue-600">
                                {q.temaParte} - Tema {q.temaNumero}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                q.difficulty === 'facil' ? 'bg-green-100 text-green-700' :
                                q.difficulty === 'media' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {q.difficulty}
                              </span>
                            </div>
                            <p className="text-lg font-bold text-gray-800 mb-3">
                              {index + 1}. {q.text}
                            </p>
                            <div className="space-y-2 mb-3">
                              {JSON.parse(q.options).map((opt: string, i: number) => (
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
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(q)}
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(q.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600">No hay preguntas generadas todavía</p>
            <Link 
              href="/admin/bulk-questions-generator"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              🚀 Generar Preguntas
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
