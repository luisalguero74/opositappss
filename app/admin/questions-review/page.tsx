'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  reviewStatus: string
  questionnaireId: string
  createdAt: string
  questionnaire: {
    id: string
    title: string
    published: boolean
  }
}

// Componente interno que maneja los searchParams
function QuestionsReviewContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [filter, setFilter] = useState<'all' | 'general' | 'especifico'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'facil' | 'media' | 'dificil'>('all')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
  const [publishTitle, setPublishTitle] = useState('')
  const [publishingSelection, setPublishingSelection] = useState(false)

  const normalizeText = (value: unknown) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')

  const safeParseOptions = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.map((v) => String(v))
    const value = String(raw ?? '').trim()
    if (!value) return []

    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v))
    } catch {
      // fall through
    }

    return value
      .split(/\r?\n|\s*\|\s*|\s*;\s*/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const normalizeTemarioParte = (value: unknown): 'general' | 'especifico' | null => {
    const normalized = normalizeText(value)
    if (!normalized) return null
    if (normalized === 'general' || normalized === 'temario general') return 'general'
    if (normalized === 'especifico' || normalized === 'temario especifico') return 'especifico'
    // Common variants
    if (normalized.includes('general')) return 'general'
    if (normalized.includes('especifico')) return 'especifico'
    return null
  }

  const normalizeDifficulty = (value: unknown): 'facil' | 'media' | 'dificil' | null => {
    const normalized = normalizeText(value)
    if (!normalized) return null
    if (normalized === 'facil' || normalized === 'fcil') return 'facil'
    if (normalized === 'media') return 'media'
    if (normalized === 'dificil') return 'dificil'
    return null
  }

  const getTopicKey = (q: Question): string | null => {
    if (q.temaCodigo) return q.temaCodigo
    const parte = normalizeTemarioParte(q.temaParte)
    if (!parte || !q.temaNumero) return null
    return `${parte}:${q.temaNumero}`
  }

  const getTopicLabel = (q: Question): string => {
    const parte = normalizeTemarioParte(q.temaParte)
    const numero = q.temaNumero ? `Tema ${q.temaNumero}` : 'Tema'
    const titulo = q.temaTitulo ? ` - ${q.temaTitulo}` : ''
    const prefix = parte === 'general' ? 'General' : parte === 'especifico' ? 'Específico' : 'Temario'
    return `${prefix}: ${numero}${titulo}`
  }

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role?.toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      loadQuestions()
    }
  }, [status, session, router])

  useEffect(() => {
    // Reset topic selection when changing temario filter
    setSelectedTopics([])
  }, [filter])

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditData({
      text: question.text,
      options: safeParseOptions(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'MEDIUM'
    })
  }

  const loadQuestions = async () => {
    try {
      setLoadError(null)
      const res = await fetch('/api/admin/questions-review')
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setQuestions([])
        setLoadError(data?.error || 'Error al cargar preguntas')
        return
      }
      const loadedQuestions = data?.questions || []
      setQuestions(loadedQuestions)
      
      // Si hay un questionId en la URL, abrir automáticamente en modo edición
      const questionIdFromUrl = searchParams?.get('questionId')
      if (questionIdFromUrl && loadedQuestions.length > 0) {
        const questionToEdit = loadedQuestions.find((q: Question) => q.id === questionIdFromUrl)
        if (questionToEdit) {
          handleEdit(questionToEdit)
          // Scroll a la pregunta después de un momento
          setTimeout(() => {
            const element = document.getElementById(`question-${questionIdFromUrl}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error('Error cargando preguntas:', error)
      setQuestions([])
      setLoadError('Error al cargar preguntas')
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const publishSelectedQuestions = async () => {
    const ids = Array.from(selectedQuestionIds)
    if (ids.length === 0) return

    if (!confirm(`¿Crear y publicar un cuestionario nuevo con ${ids.length} pregunta(s) seleccionada(s)?`)) return

    setPublishingSelection(true)
    try {
      const res = await fetch('/api/admin/questions-review/publish-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: ids,
          title: publishTitle
        })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert(data?.error || 'Error al publicar la selección')
        return
      }

      setSelectedQuestionIds(new Set())
      setPublishTitle('')
      await loadQuestions()
      alert(`✅ Cuestionario publicado: ${data?.questionnaire?.title || 'OK'}`)
    } catch (error) {
      console.error('Error publicando selección:', error)
      alert('Error al publicar la selección')
    } finally {
      setPublishingSelection(false)
    }
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

  const handleValidateOne = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'VALIDATED' ? 'DESVALIDAR' : 'VALIDAR'
    const newStatus = currentStatus === 'VALIDATED' ? 'PENDING' : 'VALIDATED'
    
    if (!confirm(`¿${action} esta pregunta?`)) return

    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [id],
          action: newStatus === 'VALIDATED' ? 'validate' : 'unpublish'
        })
      })

      if (res.ok) {
        loadQuestions()
        alert(`✅ Pregunta ${action === 'VALIDAR' ? 'validada' : 'marcada como pendiente'} correctamente`)
      }
    } catch (error) {
      console.error('Error validating:', error)
      alert('Error al cambiar el estado')
    }
  }

  const handleQuarantineOne = async (id: string) => {
    if (!confirm('¿Marcar esta pregunta como EN CUARENTENA?')) return

    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [id],
          action: 'quarantine'
        })
      })

      if (res.ok) {
        loadQuestions()
        alert('⚠️ Pregunta marcada como EN CUARENTENA')
      }
    } catch (error) {
      console.error('Error quarantining:', error)
      alert('Error al marcar en cuarentena')
    }
  }

  const handleBulkValidate = async () => {
    if (selectedQuestionIds.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }
    
    if (!confirm(`¿VALIDAR ${selectedQuestionIds.size} pregunta(s) seleccionada(s)?`)) return

    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestionIds),
          action: 'validate'
        })
      })

      if (res.ok) {
        alert(`✅ ${selectedQuestionIds.size} pregunta(s) validada(s)`)
        setSelectedQuestionIds(new Set())
        loadQuestions()
      }
    } catch (error) {
      console.error('Error validating:', error)
      alert('Error al validar preguntas')
    }
  }

  const handleBulkQuarantine = async () => {
    if (selectedQuestionIds.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }
    
    if (!confirm(`¿Poner EN CUARENTENA ${selectedQuestionIds.size} pregunta(s)?`)) return

    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestionIds),
          action: 'quarantine'
        })
      })

      if (res.ok) {
        alert(`⚠️ ${selectedQuestionIds.size} pregunta(s) en cuarentena`)
        setSelectedQuestionIds(new Set())
        loadQuestions()
      }
    } catch (error) {
      console.error('Error quarantining:', error)
      alert('Error al poner en cuarentena')
    }
  }

  const availableTopics = (() => {
    const candidates = questions.filter((q) => {
      if (filter === 'all') return true
      return normalizeTemarioParte(q.temaParte) === filter
    })

    const map = new Map<string, { key: string; label: string; numero: number | null }>()
    for (const q of candidates) {
      const key = getTopicKey(q)
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, { key, label: getTopicLabel(q), numero: q.temaNumero ?? null })
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  })()

  const filteredQuestions = questions.filter((q) => {
    if (filter !== 'all') {
      if (normalizeTemarioParte(q.temaParte) !== filter) return false
    }

    if (selectedTopics.length > 0) {
      const key = getTopicKey(q)
      if (!key || !selectedTopics.includes(key)) return false
    }

    if (difficultyFilter !== 'all') {
      if (normalizeDifficulty(q.difficulty) !== difficultyFilter) return false
    }
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

  if (!session || !session.user || session.user.role?.toLowerCase() !== 'admin') {
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

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {loadError}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-5 pb-5 border-b">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del nuevo cuestionario (opcional):</label>
              <input
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="Si lo dejas vacío se generará automáticamente"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={publishSelectedQuestions}
              disabled={selectedQuestionIds.size === 0 || publishingSelection}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                selectedQuestionIds.size === 0 || publishingSelection
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {publishingSelection
                ? 'Publicando…'
                : `✅ Publicar selección (${selectedQuestionIds.size})`}
            </button>
          </div>

          {/* Acciones masivas */}
          {selectedQuestionIds.size > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg">
                  ✓ {selectedQuestionIds.size} pregunta(s) seleccionada(s)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkValidate}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold shadow transition"
                  >
                    ✅ Validar Todas
                  </button>
                  <button
                    onClick={handleBulkQuarantine}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold shadow transition"
                  >
                    ⚠️ Cuarentena
                  </button>
                  <button
                    onClick={() => setSelectedQuestionIds(new Set())}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold shadow transition"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Categoría:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="general">Temario General</option>
                <option value="especifico">Temario Específico</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Tema(s):</label>
              <select
                multiple
                value={selectedTopics}
                disabled={filter === 'all'}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setSelectedTopics(values)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {filter === 'all' ? (
                  <option value="" disabled>
                    Selecciona primero un temario
                  </option>
                ) : availableTopics.length === 0 ? (
                  <option value="" disabled>
                    No hay temas disponibles
                  </option>
                ) : (
                  availableTopics.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">Puedes seleccionar varios manteniendo pulsado Ctrl/Cmd</p>
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
          </div>
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
                <div 
                  key={q.id} 
                  id={`question-${q.id}`}
                  className={`border-2 rounded-lg p-4 ${
                    editingId === q.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.has(q.id)}
                        onChange={() => toggleQuestionSelection(q.id)}
                        className="h-4 w-4"
                      />
                      Seleccionar
                    </label>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-gray-500">
                        {q.temaParte ? `${q.temaParte}` : ''}{q.temaNumero ? ` · Tema ${q.temaNumero}` : ''}
                      </div>
                      <div className="text-xs text-gray-400">
                        📅 {new Date(q.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

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
                    <div>
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
                            {q.reviewStatus === 'VALIDATED' && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                                ✅ VALIDADA
                              </span>
                            )}
                            {q.reviewStatus === 'QUARANTINED' && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">
                                ⚠️ CUARENTENA
                              </span>
                            )}
                            {q.reviewStatus === 'PENDING' && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded font-semibold">
                                ⏳ PENDIENTE
                              </span>
                            )}
                          </div>
                          <div className="flex items-start gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.has(q.id)}
                              onChange={() => toggleQuestionSelection(q.id)}
                              className="mt-1.5 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            <p className="text-lg font-bold text-gray-800 flex-1">
                              {index + 1}. {q.text}
                            </p>
                          </div>
                          <div className="space-y-2 mb-3">
                            {safeParseOptions(q.options).map((opt: string, i: number) => (
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
                        <div className="flex gap-2 ml-4 flex-col">
                          {q.reviewStatus === 'VALIDATED' ? (
                            <button
                              onClick={() => handleValidateOne(q.id, q.reviewStatus)}
                              className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm whitespace-nowrap"
                              title="Click para desvalidar"
                            >
                              ✅ VALIDADA
                            </button>
                          ) : (
                            <button
                              onClick={() => handleValidateOne(q.id, q.reviewStatus)}
                              className="text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-md whitespace-nowrap"
                              title="Click para validar"
                            >
                              ✓ Certificar
                            </button>
                          )}
                          {q.reviewStatus !== 'QUARANTINED' && (
                            <button
                              onClick={() => handleQuarantineOne(q.id)}
                              className="text-sm px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                              title="Marcar en cuarentena"
                            >
                              ⚠️
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(q)}
                            className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
                          >
                            🗑️
                          </button>
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

// Componente principal con Suspense
export default function QuestionsReview() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <QuestionsReviewContent />
    </Suspense>
  )
}
