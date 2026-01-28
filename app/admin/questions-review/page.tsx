'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getCorrectAnswerLetter } from '@/lib/answer-normalization'

interface Question {
  id: string
  text: string
  options: string | string[]
  correctAnswer: string
  explanation: string
  temaCodigo: string | null
  temaNumero: number | null
  temaParte: string | null
  temaTitulo: string | null
  difficulty: string | null
  reviewed: boolean
  approved: boolean
  reviewedAt: string | null
  questionnaireId: string
  questionnaire?: {
    id: string
    title: string
  } | null
  document?: {
    id: string
    title: string
    type?: string | null
    documentType?: string | null
    topic?: string | null
  } | null
  section?: {
    id: string
    title: string
  } | null
}

function normalizeParte(value: string | null | undefined): 'general' | 'especifico' | null {
  if (!value) return null
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  if (base === 'general') return 'general'
  if (base === 'especifico') return 'especifico'
  return null
}

function QuestionsReviewInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [filter, setFilter] = useState<'all' | 'general' | 'especifico'>('all')
  const [originFilter, setOriginFilter] = useState<'all' | 'cron'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'facil' | 'media' | 'dificil'>('all')
  const [selectedTemas, setSelectedTemas] = useState<number[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [creatingQuestionnaire, setCreatingQuestionnaire] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [compactView, setCompactView] = useState(true)

  const [mode, setMode] = useState<'db' | 'ai'>('db')
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSelected, setAiSelected] = useState<Set<string>>(new Set())
  const [aiWorking, setAiWorking] = useState<'qa' | 'promote' | null>(null)
  const [aiReviewedFilter, setAiReviewedFilter] = useState<'all' | 'unreviewed' | 'reviewed'>('unreviewed')
  const [aiApprovedFilter, setAiApprovedFilter] = useState<'all' | 'approved' | 'unapproved'>('all')
  const [autoFocusedFromQuality, setAutoFocusedFromQuality] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      loadQuestions()
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && mode === 'ai') {
      loadAiQuestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, aiReviewedFilter, aiApprovedFilter])

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

  // Si venimos desde /admin/questions-quality con ?questionId=, abrir directamente esa pregunta en modo edición
  useEffect(() => {
    const focusId = searchParams.get('questionId')
    if (!focusId || autoFocusedFromQuality || questions.length === 0) return

    const target = questions.find((q) => q.id === focusId)
    if (target) {
      handleEdit(target)
      setAutoFocusedFromQuality(true)
    }
  }, [searchParams, questions, autoFocusedFromQuality])

  const loadAiQuestions = async () => {
    setAiLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (aiReviewedFilter === 'reviewed') params.set('reviewed', 'true')
      if (aiReviewedFilter === 'unreviewed') params.set('reviewed', 'false')
      if (aiApprovedFilter === 'approved') params.set('approved', 'true')
      if (aiApprovedFilter === 'unapproved') params.set('approved', 'false')
      const res = await fetch(`/api/admin/ai-questions?${params.toString()}`)
      const data = await res.json()
      setAiQuestions((data.questions || []) as AIQuestion[])
    } catch (error) {
      console.error('Error cargando preguntas IA:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    const optionsArray =
      typeof question.options === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(question.options)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          })()
        : question.options

    const inferredLetter = getCorrectAnswerLetter(String(question.correctAnswer ?? ''), optionsArray)

    setEditData({
      text: question.text,
      options: optionsArray,
      correctAnswer: (inferredLetter ?? 'a').toUpperCase(),
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

  const handlePublish = async (
    questionnaireId: string,
    questionnaireMeta: { title: string },
    qsForThis: Question[]
  ) => {
    // Proponer título actual por defecto
    const currentTitle = (questionnaireMeta.title || '').trim()
    const title = prompt('Nombre del cuestionario/formulario:', currentTitle || 'Nuevo cuestionario')
    if (!title) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    // Inferir por defecto si es general o específico a partir de las preguntas
    let defaultParte: 'general' | 'especifico' = 'general'
    const partes = new Set(
      qsForThis
        .map((q) => normalizeParte(q.temaParte))
        .filter((v): v is 'general' | 'especifico' => v === 'general' || v === 'especifico')
    )
    if (partes.size === 1) {
      const only = Array.from(partes)[0]
      defaultParte = only === 'especifico' ? 'especifico' : 'general'
    }

    const parteInput = prompt(
      'Tipo de temario para este cuestionario (general / especifico):',
      defaultParte
    )
    if (!parteInput) return
    const parteNorm = normalizeParte(parteInput)
    if (!parteNorm) {
      alert('Valor no válido. Escribe "general" o "especifico".')
      return
    }

    const confirmar = confirm(
      `¿Publicar este cuestionario con estos datos?\n\n` +
      `Nombre: ${trimmedTitle}\n` +
      `Temario: ${parteNorm === 'general' ? 'GENERAL' : 'ESPECÍFICO'}\n\n` +
      `Los usuarios podrán verlo y aparecerá en sus estadísticas.`
    )
    if (!confirmar) return

    try {
      // Actualizar título y parte del temario antes de publicar
      const updateRes = await fetch(`/api/admin/questionnaires/${questionnaireId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          temaParte: parteNorm
        })
      })

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}))
        alert(`Error al actualizar el cuestionario: ${data.error || 'Error desconocido'}`)
        return
      }

      // Publicar cuestionario
      const res = await fetch(`/api/admin/questionnaires/${questionnaireId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: true })
      })

      if (res.ok) {
        loadQuestions()
        alert(
          '✅ Cuestionario publicado correctamente.\n\n' +
          'Los usuarios ahora pueden:\n' +
          '• Realizarlo de forma interactiva\n' +
          '• Ver soluciones y explicaciones\n' +
          '• Obtener celebración al 100%\n' +
          '• Registrar resultados en estadísticas'
        )
      } else {
        const data = await res.json()
        alert(`Error: ${data.error || 'No se pudo publicar'}`)
      }
    } catch (error) {
      console.error('Error publicando:', error)
      alert('Error al publicar el cuestionario')
    }
  }

  // Obtener lista única de temas según el filtro de categoría
  const availableTemas = useMemo(() => {
    const temas = new Map<number, string>()
    questions
      .filter(q => {
        if (filter !== 'all') {
          const parte = normalizeParte(q.temaParte)
          if (parte !== filter) return false
        }

        if (originFilter === 'cron') {
          const title = q.questionnaire?.title || ''
          if (!/cron/i.test(title)) return false
        }

        return true
      })
      .forEach(q => {
        if (q.temaNumero !== null) {
          const label = q.temaTitulo && q.temaTitulo.trim()
            ? q.temaTitulo.trim()
            : `Tema ${q.temaNumero}`
          if (!temas.has(q.temaNumero)) {
            temas.set(q.temaNumero, label)
          }
        }
      })
    return Array.from(temas.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, titulo]) => ({ numero: num, titulo }))
  }, [questions, filter, originFilter])

  const filteredQuestions = questions.filter(q => {
    if (filter !== 'all') {
      const parte = normalizeParte(q.temaParte)
      if (parte !== filter) return false
    }
    if (originFilter === 'cron') {
      const title = q.questionnaire?.title || ''
      if (!/cron/i.test(title)) return false
    }
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false
    if (selectedTemas.length > 0 && !selectedTemas.includes(q.temaNumero || -1)) return false
    if (searchText.trim()) {
      const haystack = [
        q.text,
        q.explanation || '',
        q.temaTitulo || '',
        q.questionnaire?.title || ''
      ]
        .join(' \n ')
        .toLowerCase()
      const needle = searchText.toLowerCase().trim()
      if (!haystack.includes(needle)) return false
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

  const handleDeleteSelected = async () => {
    if (selectedQuestions.size === 0) {
      alert('Selecciona al menos una pregunta para eliminar')
      return
    }

    if (!confirm(`¿Eliminar ${selectedQuestions.size} preguntas seleccionadas? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/questions-review', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedQuestions) })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        alert((data && data.error) || 'Error al eliminar preguntas')
        return
      }

      setSelectedQuestions(new Set())
      loadQuestions()
    } catch (error) {
      console.error('Error eliminando preguntas en lote:', error)
      alert('Error al eliminar preguntas seleccionadas')
    }
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

  const toggleAiSelected = (id: string) => {
    const next = new Set(aiSelected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setAiSelected(next)
  }

  const selectAllAi = () => {
    if (aiSelected.size === aiQuestions.length) {
      setAiSelected(new Set())
    } else {
      setAiSelected(new Set(aiQuestions.map(q => q.id)))
    }
  }

  const applyAiQa = async () => {
    if (aiSelected.size === 0) {
      alert('Selecciona al menos una pregunta IA')
      return
    }
    if (!confirm(`¿Aplicar QA (RAG + embeddings) a ${aiSelected.size} preguntas IA?`)) return

    setAiWorking('qa')
    try {
      const res = await fetch('/api/admin/ai-questions/batch-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(aiSelected), batchSize: 5 })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert(`✅ QA completado:\n- Procesadas: ${data.procesadas}\n- Exitosas: ${data.exitosas}\n- Fallidas: ${data.fallidas}`)
        setAiSelected(new Set())
        loadAiQuestions()
      } else {
        alert(`Error: ${data.error || 'No se pudo aplicar QA'}`)
      }
    } catch (error) {
      console.error('Error aplicando QA:', error)
      alert('Error aplicando QA')
    } finally {
      setAiWorking(null)
    }
  }

  const promoteAiToDb = async () => {
    if (aiSelected.size === 0) {
      alert('Selecciona al menos una pregunta IA')
      return
    }

    const title = prompt(`Nombre del cuestionario destino (${aiSelected.size} preguntas):`)
    if (!title) return

    setAiWorking('promote')
    try {
      const res = await fetch('/api/admin/ai-questions/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(aiSelected), questionnaireTitle: title })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert(`✅ Enviadas a la base de datos:\n- Cuestionario: ${data.questionnaire?.title}\n- Preguntas creadas: ${data.createdQuestions}`)
        setAiSelected(new Set())
      } else {
        alert(`Error: ${data.error || 'No se pudieron enviar'}`)
      }
    } catch (error) {
      console.error('Error enviando a BD:', error)
      alert('Error enviando a la base de datos')
    } finally {
      setAiWorking(null)
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 inline-block font-semibold">
              ← Volver al Panel Admin
            </Link>
            <Link
              href="/admin/questions-quality"
              className="inline-block bg-white border border-blue-200 text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm"
            >
              ✨ Revisión de Calidad
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-2">📋 Revisar y Gestionar Preguntas</h1>
          <p className="text-gray-600">Edita, elimina y publica cuestionarios generados</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Submenú */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setMode('db')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border ${mode === 'db' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
            >
              📚 Preguntas (BD)
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border ${mode === 'ai' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
            >
              🤖 Preguntas IA
            </button>
          </div>

          {mode === 'ai' && (
            <div className="border rounded-lg p-4 bg-purple-50 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-800">Submenú: QA + Enviar a Base de Datos</div>
                  <div className="text-sm text-gray-600">
                    Mostradas: {aiQuestions.length} · Seleccionadas: {aiSelected.size}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Estado:</label>
                    <select
                      value={aiReviewedFilter}
                      onChange={(e) => {
                        setAiReviewedFilter(e.target.value as any)
                        setAiSelected(new Set())
                      }}
                      className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white"
                    >
                      <option value="all">Todas</option>
                      <option value="unreviewed">Sin revisar</option>
                      <option value="reviewed">Revisadas</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Aprobación:</label>
                    <select
                      value={aiApprovedFilter}
                      onChange={(e) => {
                        setAiApprovedFilter(e.target.value as any)
                        setAiSelected(new Set())
                      }}
                      className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white"
                    >
                      <option value="all">Todas</option>
                      <option value="approved">Aprobadas</option>
                      <option value="unapproved">No aprobadas</option>
                    </select>
                  </div>
                  <button
                    onClick={selectAllAi}
                    disabled={aiLoading || aiQuestions.length === 0}
                    className="px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 font-semibold text-sm"
                  >
                    {aiSelected.size === aiQuestions.length && aiQuestions.length > 0 ? '☑️ Deseleccionar todas' : '☐ Seleccionar todas'}
                  </button>
                  <button
                    onClick={applyAiQa}
                    disabled={aiWorking !== null || aiSelected.size === 0}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-semibold text-sm"
                  >
                    {aiWorking === 'qa' ? '⏳ Aplicando QA...' : `✨ Aplicar QA (${aiSelected.size})`}
                  </button>
                  <button
                    onClick={promoteAiToDb}
                    disabled={aiWorking !== null || aiSelected.size === 0}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-semibold text-sm"
                  >
                    {aiWorking === 'promote' ? '⏳ Enviando...' : `📥 Enviar a BD (${aiSelected.size})`}
                  </button>
                </div>
              </div>

              {aiLoading && (
                <div className="mt-3 text-sm text-gray-600">Cargando preguntas IA...</div>
              )}

              {!aiLoading && aiQuestions.length === 0 && (
                <div className="mt-3 text-sm text-gray-600">No hay preguntas IA para mostrar.</div>
              )}

              {!aiLoading && aiQuestions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {aiQuestions.map(q => {
                    const options: string[] = Array.isArray(q.options)
                      ? q.options
                      : (() => {
                          if (typeof q.options !== 'string') return []
                          try {
                            const parsed = JSON.parse(q.options)
                            return Array.isArray(parsed) ? parsed : []
                          } catch {
                            return []
                          }
                        })()

                    return (
                      <div key={q.id} className="bg-white border border-purple-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={aiSelected.has(q.id)}
                            onChange={() => toggleAiSelected(q.id)}
                            className="mt-1 w-5 h-5 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <div className="text-sm text-gray-600">
                                {q.document?.title ? <span className="font-semibold">{q.document.title}</span> : 'Documento'}
                                {q.section?.title ? <span> · {q.section.title}</span> : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {q.reviewed ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                    ✅ Revisada
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                    ⏳ Sin revisar
                                  </span>
                                )}
                                {q.difficulty ? (
                                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                    {q.difficulty}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-2 font-semibold text-gray-900">{q.text}</div>

                            {options.length > 0 && (() => {
                              const letter = getCorrectAnswerLetter(String(q.correctAnswer ?? ''), options)
                              const correctLetter = letter ? letter.toUpperCase() : null

                              return (
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {options.map((opt, idx) => {
                                    const label = ['A', 'B', 'C', 'D'][idx]
                                    const isCorrect = correctLetter === label
                                    return (
                                      <div
                                        key={idx}
                                        className={`text-sm p-2 rounded border ${
                                          isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                        }`}
                                      >
                                        <span className="font-semibold">{label})</span> {opt}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}

                            {q.explanation && (
                              <div className="mt-3 text-sm text-gray-700 bg-purple-50 border border-purple-100 rounded p-3">
                                <span className="font-semibold">Explicación:</span> {q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {mode === 'ai' && (
            <div className="text-sm text-gray-500 mb-4">
              Consejo: aplica QA antes de enviar a la base de datos.
            </div>
          )}

          {mode === 'ai' && (
            <div className="border-t pt-6" />
          )}

          {mode === 'db' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por origen:</label>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los cuestionarios</option>
                <option value="cron">Solo generados por Cron</option>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar por texto, explicación o cuestionario:</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Escribe parte de la pregunta, explicación o título..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setCompactView(prev => !prev)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2"
              >
                {compactView ? '🔎 Ver detalle completo' : '📋 Ver en modo compacto'}
              </button>
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
              <button
                onClick={handleDeleteSelected}
                disabled={selectedQuestions.size === 0}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                🗑️ Eliminar seleccionadas ({selectedQuestions.size})
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* Cuestionarios */}
        {mode === 'db' && Object.entries(questionsByQuestionnaire).map(([qId, { questionnaire, questions }]) => (
          <div key={qId} className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{questionnaire.title}</h2>
                <p className="text-gray-600">{questions.length} preguntas</p>
              </div>
              <div className="flex gap-3">
                {!questionnaire.published && (
                  <button
                    onClick={() => handlePublish(qId, questionnaire, questions)}
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
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                              {q.questionnaire?.title && (
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 max-w-xs truncate">
                                  {q.questionnaire.title}
                                </span>
                              )}
                            </div>

                            {compactView ? (
                              <p className="text-base font-semibold text-gray-800 mb-1">
                                {index + 1}.{' '}
                                {q.text.length > 220 ? `${q.text.slice(0, 220)}…` : q.text}
                              </p>
                            ) : (
                              <p className="text-lg font-bold text-gray-800 mb-3">
                                {index + 1}. {q.text}
                              </p>
                            )}

                            {!compactView && (
                              <>
                                <div className="space-y-2 mb-3">
                                  {(() => {
                                    const options: string[] = Array.isArray(q.options)
                                      ? q.options
                                      : (() => {
                                          if (typeof q.options !== 'string') return [] as string[]
                                          try {
                                            const parsed = JSON.parse(q.options)
                                            return Array.isArray(parsed) ? parsed : []
                                          } catch {
                                            return [] as string[]
                                          }
                                        })()

                                    const letter = getCorrectAnswerLetter(String(q.correctAnswer ?? ''), options)
                                    const correctLetter = letter ? letter.toUpperCase() : null

                                    return options.map((opt: string, i: number) => {
                                      const label = String.fromCharCode(65 + i)
                                      const isCorrect = correctLetter === label
                                      return (
                                        <div
                                          key={i}
                                          className={`px-3 py-2 rounded ${
                                            isCorrect
                                              ? 'bg-green-100 border-2 border-green-400 font-semibold'
                                              : 'bg-gray-50'
                                          }`}
                                        >
                                          {label}) {opt}
                                        </div>
                                      )
                                    })
                                  })()}
                                </div>
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                                  <p className="text-sm text-gray-700">
                                    <strong>Explicación:</strong> {q.explanation}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4 items-end">
                            <button
                              onClick={() => setCompactView(prev => !prev)}
                              className="border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50 text-xs"
                            >
                              {compactView ? '🔎 Ver detalle' : '📋 Ver compacto'}
                            </button>
                            <div className="flex gap-2">
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {mode === 'db' && filteredQuestions.length === 0 && (
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

export default function QuestionsReview() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Cargando revisión de preguntas...</p>
        </div>
      }
    >
      <QuestionsReviewInner />
    </Suspense>
  )
}
