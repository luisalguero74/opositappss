'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UnifiedQuestion {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  difficulty: string
  tema: string
  temaOficialId?: string | null
  temarioCategoria?: 'general' | 'especifico' | null
  temaNumero?: number | null
  temaTitulo?: string | null
  source: 'manual' | 'ai'
}

interface TemaOficialOption {
  id: string
  categoria: 'general' | 'especifico'
  numero: number
  codigo: string
  titulo: string
  count: number
}

interface UnifiedQuestionsResponse {
  success: boolean
  questions: UnifiedQuestion[]
  temas: string[]
  temasOficiales?: TemaOficialOption[]
  temasOficialesPorTemario?: {
    general: TemaOficialOption[]
    especifico: TemaOficialOption[]
  }
  summary: {
    manual: number
    ai: number
    duplicateRemoved: number
  }
}

export default function CreateFormulario() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<UnifiedQuestion[]>([])
  const [temasOficialesPorTemario, setTemasOficialesPorTemario] = useState<{
    general: TemaOficialOption[]
    especifico: TemaOficialOption[]
  }>({ general: [], especifico: [] })
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [formTitle, setFormTitle] = useState('Formulario de Prueba - opositAPPSS')
  const [showExplanations, setShowExplanations] = useState(true)
  const [showDifficulty, setShowDifficulty] = useState(true)
  const [randomizeOrder, setRandomizeOrder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [publishingAsQuestionnaire, setPublishingAsQuestionnaire] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [filterTemario, setFilterTemario] = useState<'ambos' | 'general' | 'especifico'>('ambos')
  const [selectedTemaIds, setSelectedTemaIds] = useState<string[]>([]) // vacío => todos
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [showPreview, setShowPreview] = useState(false)
  const [loadError, setLoadError] = useState<string>('')

  useEffect(() => {
    if (status === 'authenticated' && String(session?.user?.role || '').toLowerCase() === 'admin') {
      loadQuestions()
    }
  }, [status, session])

  const loadQuestions = async () => {
    setLoadingQuestions(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/unified-questions?limit=500', {
        credentials: 'include'
      })

      const data: UnifiedQuestionsResponse & { error?: string; diagnostics?: any } = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        const msg = data?.error || `Error al cargar preguntas (${res.status})`
        setLoadError(msg)
        setQuestions([])
        setTemasOficialesPorTemario({ general: [], especifico: [] })
        return
      }

      setQuestions(data.questions || [])
      if (data.temasOficialesPorTemario) {
        setTemasOficialesPorTemario({
          general: data.temasOficialesPorTemario.general || [],
          especifico: data.temasOficialesPorTemario.especifico || []
        })
      } else {
        setTemasOficialesPorTemario({ general: [], especifico: [] })
      }
    } catch (error) {
      console.error('Error loading questions:', error)
      setLoadError(error instanceof Error ? error.message : 'Error al cargar preguntas')
    } finally {
      setLoadingQuestions(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
    router.push('/dashboard')
    return null
  }

  const temasDisponibles: TemaOficialOption[] =
    filterTemario === 'general'
      ? temasOficialesPorTemario.general
      : filterTemario === 'especifico'
        ? temasOficialesPorTemario.especifico
        : [...temasOficialesPorTemario.general, ...temasOficialesPorTemario.especifico]

  const filteredQuestions = questions.filter(q => {
    if (filterTemario !== 'ambos') {
      if (!q.temarioCategoria) return false
      if (q.temarioCategoria !== filterTemario) return false
    }

    if (selectedTemaIds.length > 0) {
      if (!q.temaOficialId) return false
      if (!selectedTemaIds.includes(q.temaOficialId)) return false
    }

    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    return true
  })

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedQuestions(filteredQuestions.map(q => q.id))
  }

  const clearAll = () => {
    setSelectedQuestions([])
  }

  const generateHTML = async (download: boolean = true) => {
    if (selectedQuestions.length === 0) {
      alert('Debes seleccionar al menos una pregunta')
      return
    }

    setLoading(true)
    try {
      // Obtener datos de preguntas seleccionadas
      const selectedQuestionData = questions.filter(q => selectedQuestions.includes(q.id))

      const selectedTemaItems = selectedTemaIds
        .map(id => temasDisponibles.find(t => t.id === id))
        .filter((t): t is TemaOficialOption => Boolean(t))

      const temarioLabel =
        filterTemario === 'general'
          ? 'Temario General'
          : filterTemario === 'especifico'
            ? 'Temario Específico'
            : 'Temario General + Específico'

      const temaLabel =
        selectedTemaItems.length === 1
          ? `${selectedTemaItems[0].codigo} - ${selectedTemaItems[0].titulo}`
          : selectedTemaItems.length > 1
            ? `${temarioLabel} (${selectedTemaItems.length} temas)`
            : temarioLabel
      
      const res = await fetch('/api/admin/generate-form-with-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: selectedQuestionData,
          title: formTitle,
          showExplanations,
          showDifficulty,
          randomizeOrder,
          tema: temaLabel
        })
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        
        if (download) {
          // Descargar archivo
          const a = document.createElement('a')
          a.href = url
          a.download = `formulario-${Date.now()}.html`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          alert('✅ Formulario HTML con solucionario descargado con éxito')
        } else {
          // Abrir en nueva pestaña
          window.open(url, '_blank')
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Error al generar el formulario')
      }
    } catch (error) {
      alert('Error al generar el formulario')
    } finally {
      setLoading(false)
    }
  }

  const publishAsQuestionnaire = async () => {
    if (selectedQuestions.length === 0) {
      alert('Debes seleccionar al menos una pregunta')
      return
    }

    const title = prompt('¿Cuál es el título del cuestionario?', formTitle)
    if (!title) return

    setPublishingAsQuestionnaire(true)
    try {
      const res = await fetch('/api/admin/unified-questions/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: selectedQuestions,
          title: title
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Cuestionario "${title}" publicado exitosamente`)
        // Redirigir a página de revisión de cuestionarios
        router.push('/admin/questions-review')
      } else {
        const error = await res.json()
        alert(error.error || 'Error al publicar el cuestionario')
      }
    } catch (error) {
      alert('Error al publicar el cuestionario')
    } finally {
      setPublishingAsQuestionnaire(false)
    }
  }

  const previewHTML = () => {
    if (selectedQuestions.length === 0) {
      alert('Debes seleccionar al menos una pregunta para previsualizar')
      return
    }
    setShowPreview(true)
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando preguntas...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-xl bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error cargando temas/preguntas</h1>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <div className="flex gap-2">
            <button
              onClick={loadQuestions}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
              type="button"
            >
              Reintentar
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold"
            >
              Volver al Panel Admin
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-4xl font-bold text-white">Crear Formulario HTML Interactivo</h1>
              <p className="text-purple-100 mt-2">Genera formularios HTML a partir de preguntas generadas por IA</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Configuración */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🔍 Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temario</label>
                  <select
                    value={filterTemario}
                    onChange={(e) => {
                      const next = (e.target.value as 'ambos' | 'general' | 'especifico')
                      setFilterTemario(next)
                      setSelectedTemaIds([])
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="ambos">General + Específico</option>
                    <option value="general">General</option>
                    <option value="especifico">Específico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temas</label>
                  <select
                    multiple
                    value={selectedTemaIds}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions).map(o => o.value)
                      setSelectedTemaIds(values)
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                    style={{ minHeight: 96 }}
                  >
                    {temasDisponibles.map(tema => (
                      <option key={tema.id} value={tema.id}>
                        {tema.codigo} - {tema.titulo} ({tema.count})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Si no seleccionas ningún tema, se usarán todos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dificultad</label>
                  <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">Todas</option>
                    <option value="facil">🟢 Fácil</option>
                    <option value="media">🟡 Media</option>
                    <option value="dificil">🔴 Difícil</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setSelectedTemaIds([])}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                    type="button"
                  >
                    Limpiar temas
                  </button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold"
                >
                  Seleccionar todas ({filteredQuestions.length})
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                >
                  Limpiar selección
                </button>
              </div>
            </div>

            {/* Lista de Preguntas */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📋 Preguntas Disponibles ({filteredQuestions.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay preguntas disponibles con estos filtros</p>
                ) : (
                  filteredQuestions.map((q, index) => {
                    const isSelected = selectedQuestions.includes(q.id)
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-5 h-5 text-purple-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-700">#{index + 1}</span>
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                {q.tema || 'Sin tema'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                q.difficulty === 'facil' ? 'bg-green-100 text-green-700' :
                                q.difficulty === 'dificil' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {q.difficulty === 'facil' ? '🟢 Fácil' :
                                 q.difficulty === 'dificil' ? '🔴 Difícil' : '🟡 Media'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                q.source === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {q.source === 'manual' ? '📝 Manual' : '🤖 IA'}
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium">{q.text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Panel de Opciones y Generación */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⚙️ Opciones</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título del Formulario
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="Título del formulario..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExplanations}
                      onChange={(e) => setShowExplanations(e.target.checked)}
                      className="w-5 h-5 text-purple-600"
                    />
                    <span className="text-gray-700 font-medium">Mostrar explicaciones</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDifficulty}
                      onChange={(e) => setShowDifficulty(e.target.checked)}
                      className="w-5 h-5 text-purple-600"
                    />
                    <span className="text-gray-700 font-medium">Mostrar nivel de dificultad</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeOrder}
                      onChange={(e) => setRandomizeOrder(e.target.checked)}
                      className="w-5 h-5 text-purple-600"
                    />
                    <span className="text-gray-700 font-medium">Aleatorizar orden de preguntas</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Preguntas seleccionadas</p>
                  <p className="text-4xl font-bold text-purple-600">{selectedQuestions.length}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={previewHTML}
                  disabled={selectedQuestions.length === 0}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👁️ Previsualizar
                </button>
                
                <button
                  onClick={() => generateHTML(false)}
                  disabled={loading || selectedQuestions.length === 0}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Generando...' : '🌐 Abrir HTML en Nueva Pestaña'}
                </button>
                
                <button
                  onClick={() => generateHTML(true)}
                  disabled={loading || selectedQuestions.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Generando...' : '📥 Descargar HTML con Solucionario'}
                </button>

                <button
                  onClick={publishAsQuestionnaire}
                  disabled={publishingAsQuestionnaire || selectedQuestions.length === 0}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg hover:from-orange-700 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishingAsQuestionnaire ? '⏳ Publicando...' : '🚀 Publicar como Cuestionario'}
                </button>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  💡 <strong>Opciones disponibles:</strong><br/>
                  • <strong>Previsualizar:</strong> Vista rápida en modal<br/>
                  • <strong>Abrir HTML:</strong> Ver formulario en nueva pestaña<br/>
                  • <strong>Descargar HTML:</strong> Guardar archivo con solucionario<br/>
                  • <strong>Publicar:</strong> Guardar como cuestionario en BD<br/><br/>
                  ✨ HTML incluye: corrección automática, solucionario con explicaciones, celebración al 100%, estadísticas y es 100% funcional sin servidor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Previsualización */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">👁️ Previsualización</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-800">{formTitle}</h1>
                  <p className="text-gray-600 mt-2">Total de preguntas: {selectedQuestions.length}</p>
                </div>
                
                {questions
                  .filter(q => selectedQuestions.includes(q.id))
                  .map((q, index) => (
                    <div key={q.id} className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-xl font-bold text-purple-600">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-gray-800">{q.text}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">{q.tema}</span>
                            {showDifficulty && (
                              <span className={`inline-block text-xs px-2 py-1 rounded ${
                                q.difficulty === 'facil' ? 'bg-green-100 text-green-700' :
                                q.difficulty === 'dificil' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {q.difficulty === 'facil' ? '🟢 Fácil' :
                                 q.difficulty === 'dificil' ? '🔴 Difícil' : '🟡 Media'}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              q.source === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {q.source === 'manual' ? '📝 Manual' : '🤖 IA'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 ml-8">
                        {q.options.map((option: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-3 bg-white rounded border border-gray-200">
                            <span className="font-semibold text-gray-600">{String.fromCharCode(65 + i)})</span>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 ml-8 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-semibold text-green-700">
                          ✓ Respuesta correcta: {q.correctAnswer}
                        </p>
                      </div>
                      {showExplanations && q.explanation && (
                        <div className="mt-4 ml-8 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-700">
                            <strong>Explicación:</strong> {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
