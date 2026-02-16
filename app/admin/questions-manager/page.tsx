'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCorrectAnswerLetter, safeParseOptions } from '@/lib/answer-normalization'

interface Question {
  id: string
  text: string
  options: string
  correctAnswer: string
  explanation: string | null
  temaCodigo: string | null
  temaNumero: number | null
  temaParte: string | null
  temaTitulo: string | null
  difficulty: string | null
  reviewStatus: string
  aiReviewed: boolean | null
  questionnaireId: string
  questionnaire: {
    id: string
    title: string
    published: boolean
  }
}

interface Stats {
  total: number
  validated: number
  pending: number
  quarantined: number
}

export default function QuestionsManagerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'browse' | 'quality' | 'create'>('browse')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Filtros
  const [filterTemario, setFilterTemario] = useState<'all' | 'general' | 'especifico'>('all')
  const [filterTema, setFilterTema] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'facil' | 'media' | 'dificil'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'VALIDATED' | 'QUARANTINED'>('all')
  const [searchText, setSearchText] = useState('')
  
  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  
  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated' || (session?.user?.role?.toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    } else {
      loadQuestions()
      loadStats()
    }
  }, [status, session, router])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/questions-review')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/questions/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditData({
      text: question.text,
      options: safeParseOptions(question.options),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'media'
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
        loadStats()
      }
    } catch (error) {
      console.error('Error saving:', error)
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
        loadStats()
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleValidateOne = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'VALIDATED' ? 'PENDING' : 'VALIDATED'
    const action = newStatus === 'VALIDATED' ? 'VALIDAR' : 'DESVALIDAR'
    
    if (!confirm(`¿${action} esta pregunta?`)) return

    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [id],
          action: newStatus === 'VALIDATED' ? 'validate' : 'quarantine'
        })
      })

      if (res.ok) {
        loadQuestions()
        loadStats()
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
        loadStats()
        alert('⚠️ Pregunta marcada como EN CUARENTENA')
      }
    } catch (error) {
      console.error('Error quarantining:', error)
      alert('Error al marcar en cuarentena')
    }
  }

  const handleBulkAction = async (action: 'validate' | 'quarantine' | 'delete' | 'regenerate') => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }

    const actionNames = {
      validate: 'validar',
      quarantine: 'poner en cuarentena',
      delete: 'eliminar',
      regenerate: 'regenerar explicaciones de'
    }

    if (!confirm(`¿${actionNames[action].toUpperCase()} ${selectedIds.size} pregunta(s)?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedIds),
          action: action
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Acción completada: ${data.message || 'OK'}`)
        setSelectedIds(new Set())
        loadQuestions()
        loadStats()
      }
    } catch (error) {
      console.error('Error in bulk action:', error)
      alert('Error al ejecutar la acción')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoValidateHighQuality = async () => {
    // Identificar preguntas de alta calidad (explicación completa, no cuarentena, pendientes)
    const highQualityQuestions = questions.filter(q => 
      q.reviewStatus === 'PENDING' &&
      q.explanation && 
      q.explanation.length >= 80 &&
      q.text.length >= 30
    )

    if (highQualityQuestions.length === 0) {
      alert('No hay preguntas pendientes con explicaciones completas para auto-validar')
      return
    }

    const message = `¿Auto-validar ${highQualityQuestions.length} preguntas de alta calidad?\n\n` +
      `Criterios aplicados:\n` +
      `✓ Estado: PENDIENTE\n` +
      `✓ Explicación completa (≥80 caracteres)\n` +
      `✓ Pregunta completa (≥30 caracteres)\n` +
      `✓ No en cuarentena\n\n` +
      `Estas preguntas se marcarán como VALIDADAS automáticamente.`

    if (!confirm(message)) return

    setLoading(true)
    try {
      const questionIds = highQualityQuestions.map(q => q.id)
      const res = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds,
          action: 'validate'
        })
      })

      if (res.ok) {
        alert(`✅ ${highQualityQuestions.length} preguntas validadas automáticamente`)
        loadQuestions()
        loadStats()
      }
    } catch (error) {
      console.error('Error in auto-validation:', error)
      alert('Error al auto-validar preguntas')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredQuestions = questions.filter(q => {
    // Filtro por temario
    if (filterTemario !== 'all') {
      const parte = String(q.temaParte || '').toLowerCase()
      if (filterTemario === 'general' && !parte.includes('general')) return false
      if (filterTemario === 'especifico' && !parte.includes('especifico')) return false
    }

    // Filtro por tema
    if (filterTema && String(q.temaNumero) !== filterTema) return false

    // Filtro por dificultad
    if (filterDifficulty !== 'all') {
      const diff = String(q.difficulty || '').toLowerCase()
      if (filterDifficulty !== diff) return false
    }

    // Filtro por estado
    if (filterStatus !== 'all' && q.reviewStatus !== filterStatus) return false

    // Filtro por texto
    if (searchText && !q.text.toLowerCase().includes(searchText.toLowerCase())) return false

    return true
  })

  if (!session || session.user.role?.toLowerCase() !== 'admin') return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold text-white">Gestión Avanzada de Preguntas</h1>
              <p className="text-blue-100 mt-2">Sistema unificado de validación, edición y creación de cuestionarios</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Preguntas</div>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-green-700">{stats.validated.toLocaleString()}</div>
                <div className="text-sm text-green-600">✅ Validadas</div>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-yellow-700">{stats.pending.toLocaleString()}</div>
                <div className="text-sm text-yellow-600">⏳ Pendientes</div>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-red-700">{stats.quarantined.toLocaleString()}</div>
                <div className="text-sm text-red-600">⚠️ Cuarentena</div>
              </div>
            </div>

            {/* Progress Dashboard */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl p-6 mb-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">🎯 Progreso de Validación</h2>
                  <p className="text-indigo-100 text-sm mt-1">Camino hacia preguntas de calidad certificada</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{Math.round((stats.validated / 500) * 100)}%</div>
                  <div className="text-sm text-indigo-100">Completado</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="bg-indigo-800 rounded-full h-6 overflow-hidden mb-4">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${Math.min((stats.validated / 500) * 100, 100)}%` }}
                >
                  {stats.validated >= 25 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {stats.validated} / 500
                    </span>
                  )}
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="text-2xl font-bold">{500 - stats.validated}</div>
                  <div className="text-sm text-indigo-100">Preguntas hasta la meta</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="text-2xl font-bold">
                    {stats.validated >= 500 ? '✅' : Math.ceil((500 - stats.validated) / 20)}
                  </div>
                  <div className="text-sm text-indigo-100">
                    {stats.validated >= 500 ? '¡Meta alcanzada!' : 'Sesiones estimadas (20/sesión)'}
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                  <div className="text-2xl font-bold">
                    {stats.validated >= 500 ? '🚀' : '⏳'}
                  </div>
                  <div className="text-sm text-indigo-100">
                    {stats.validated >= 500 
                      ? 'Activar corte duro disponible' 
                      : 'Sigue validando preguntas'}
                  </div>
                </div>
              </div>

              {/* CTA cuando se alcance la meta */}
              {stats.validated >= 500 && (
                <div className="mt-4 bg-green-500 rounded-lg p-4 text-center">
                  <p className="font-bold text-lg mb-2">🎉 ¡Has alcanzado la meta de 500 preguntas validadas!</p>
                  <p className="text-sm text-green-100 mb-3">
                    Ya puedes activar el "corte duro" para que los usuarios solo vean preguntas certificadas
                  </p>
                  <div className="text-xs text-green-100 bg-green-600 rounded p-2 font-mono">
                    Configurar en Vercel: ENFORCE_ONLY_VALIDATED_QUESTIONS=true
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'browse'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              📋 Explorar y Editar
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'quality'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              ⭐ Control de Calidad
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              ➕ Crear Cuestionario
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">🔍 Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Temario</label>
                  <select
                    value={filterTemario}
                    onChange={(e) => setFilterTemario(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    <option value="general">General</option>
                    <option value="especifico">Específico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tema</label>
                  <input
                    type="number"
                    value={filterTema}
                    onChange={(e) => setFilterTema(e.target.value)}
                    placeholder="Núm. tema"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dificultad</label>
                  <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all">Todas</option>
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    <option value="VALIDATED">✅ Validadas</option>
                    <option value="PENDING">⏳ Pendientes</option>
                    <option value="QUARANTINED">⚠️ Cuarentena</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Buscar texto</label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {filteredQuestions.length} de {questions.length} preguntas
                </div>
                <button
                  onClick={handleAutoValidateHighQuality}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all transform hover:scale-105"
                  title="Valida automáticamente preguntas con explicación completa"
                >
                  🚀 Auto-Validar Alta Calidad
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {selectedIds.size} pregunta(s) seleccionada(s)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAction('validate')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                      disabled={loading}
                    >
                      ✅ Validar
                    </button>
                    <button
                      onClick={() => handleBulkAction('quarantine')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold"
                      disabled={loading}
                    >
                      ⚠️ Cuarentena
                    </button>
                    <button
                      onClick={() => handleBulkAction('regenerate')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
                      disabled={loading}
                    >
                      🔄 Regenerar
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                      disabled={loading}
                    >
                      🗑️ Eliminar
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando preguntas...</p>
                </div>
              )}

              {!loading && filteredQuestions.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-600">No hay preguntas que coincidan con los filtros</p>
                </div>
              )}

              {!loading && filteredQuestions.map((q) => (
                <div key={q.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelection(q.id)}
                      className="mt-1"
                    />

                    {/* Content */}
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
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
                        <div className="flex gap-2">
                          {editingId !== q.id && (
                            <>
                              {q.reviewStatus === 'VALIDATED' ? (
                                <button
                                  onClick={() => handleValidateOne(q.id, q.reviewStatus)}
                                  className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm"
                                  title="Click para desvalidar"
                                >
                                  ✅ VALIDADA
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleValidateOne(q.id, q.reviewStatus)}
                                  className="text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold shadow-md"
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
                                className="text-sm px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDelete(q.id)}
                                className="text-sm px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Question Content */}
                      {editingId === q.id ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">Enunciado:</label>
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
                                value={editData.options[i] || ''}
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
                              rows={4}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleSave(q.id)}
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                            >
                              💾 Guardar
                            </button>
                            <button
                              onClick={() => {
                                handleSave(q.id)
                                setTimeout(() => handleValidateOne(q.id, q.reviewStatus), 500)
                              }}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold"
                            >
                              💾✅ Guardar y Certificar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                            >
                              ✕ Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div>
                          <p className="text-lg font-bold text-gray-800 mb-3">{q.text}</p>
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
                          {q.explanation && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                              <p className="text-sm text-gray-700">
                                <strong>Explicación:</strong> {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">El sistema de control de calidad está disponible en:</p>
            <Link
              href="/admin/questions-quality"
              className="inline-block bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold px-6 py-3 rounded-lg hover:from-rose-600 hover:to-pink-700 transition"
            >
              🔗 Abrir Control de Calidad Completo →
            </Link>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">Para crear cuestionarios, puedes usar:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/admin/questions-create"
                className="block p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="text-3xl mb-2">➕</div>
                <h3 className="font-bold text-gray-800 mb-2">Crear Manualmente</h3>
                <p className="text-sm text-gray-600">Crea preguntas una por una con formulario</p>
              </Link>
              <Link
                href="/admin/bulk-questions-generator"
                className="block p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <div className="text-3xl mb-2">🚀</div>
                <h3 className="font-bold text-gray-800 mb-2">Generador Masivo IA</h3>
                <p className="text-sm text-gray-600">Genera cientos de preguntas automáticamente</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
