'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemaOficial {
  id: string
  numero: int
  titulo: string
  categoria: 'general' | 'especifico'
  _count?: {
    preguntas: number
  }
}

interface QuestionPreview {
  id: string
  text: string
  difficulty: string
  tema: string
}

export default function CreateQuestionnairePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Estado del wizard
  const [step, setStep] = useState(1)

  // Paso 1: Configuración básica
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'theory' | 'practical' | 'mixed'>('theory')

  // Paso 2: Selección de temas
  const [temarioType, setTemarioType] = useState<'general' | 'especifico' | 'ambos'>('general')
  const [selectedTemas, setSelectedTemas] = useState<string[]>([])
  const [temasDisponibles, setTemasDisponibles] = useState<TemaOficial[]>([])
  const [loadingTemas, setLoadingTemas] = useState(true)

  // Paso 3: Configuración avanzada
  const [difficulty, setDifficulty] = useState<string[]>(['facil', 'media', 'dificil'])
  const [questionCount, setQuestionCount] = useState(50)
  const [distribution, setDistribution] = useState<'equitativa' | 'proporcional' | 'manual'>('equitativa')
  const [selectionMode, setSelectionMode] = useState<'aleatoria' | 'recientes' | 'menos_respondidas'>('aleatoria')

  // Preview
  const [previewQuestions, setPreviewQuestions] = useState<QuestionPreview[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Creating
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      loadTemas()
    }
  }, [status])

  const loadTemas = async () => {
    try {
      const res = await fetch('/api/admin/temas-oficiales')
      if (res.ok) {
        const data = await res.json()
        setTemasDisponibles(data.temas || [])
      }
    } catch (error) {
      console.error('Error loading temas:', error)
    } finally {
      setLoadingTemas(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    router.push('/dashboard')
    return null
  }

  const temasGenerales = temasDisponibles.filter(t => t.categoria === 'general')
  const temasEspecificos = temasDisponibles.filter(t => t.categoria === 'especifico')

  const toggleTema = (temaId: string) => {
    setSelectedTemas(prev =>
      prev.includes(temaId) ? prev.filter(id => id !== temaId) : [...prev, temaId]
    )
  }

  const handleCreateQuestionnaire = async () => {
    if (!title.trim()) {
      alert('El título es obligatorio')
      return
    }

    if (selectedTemas.length === 0) {
      alert('Debes seleccionar al menos un tema')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/questionnaires/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          temaIds: selectedTemas,
          difficulty,
          questionCount,
          distribution,
          selectionMode
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Cuestionario creado exitosamente con ${data.totalQuestions} preguntas`)
        router.push(`/admin/questions-review`)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al crear cuestionario')
      }
    } catch (error) {
      alert('Error al crear cuestionario')
    } finally {
      setCreating(false)
    }
  }

  const loadPreview = async () => {
    if (selectedTemas.length === 0) return

    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/questionnaires/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temaIds: selectedTemas,
          difficulty,
          questionCount,
          selectionMode
        })
      })

      if (res.ok) {
        const data = await res.json()
        setPreviewQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error loading preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📝 Crear Nuevo Cuestionario
            </h1>
            <p className="text-gray-600">
              Sistema de banco de preguntas por tema
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Volver
          </Link>
        </div>

        {/* Progress stepper */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className={step === 1 ? 'font-bold text-blue-700' : 'text-gray-500'}>
              1️⃣ Configuración
            </span>
            <span>›</span>
            <span className={step === 2 ? 'font-bold text-blue-700' : 'text-gray-500'}>
              2️⃣ Selección de Temas
            </span>
            <span>›</span>
            <span className={step === 3 ? 'font-bold text-blue-700' : 'text-gray-500'}>
              3️⃣ Opciones Avanzadas
            </span>
            <span>›</span>
            <span className={step === 4 ? 'font-bold text-blue-700' : 'text-gray-500'}>
              4️⃣ Vista Previa
            </span>
          </div>
        </div>

        {/* Step 1: Configuración básica */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Paso 1 · Configuración básica</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título del cuestionario *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Test Temas 1-5 General"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de cuestionario
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setType('theory')}
                  className={`p-4 rounded-lg border-2 transition ${
                    type === 'theory'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">📚</div>
                  <div className="font-semibold">Teoría</div>
                </button>
                <button
                  onClick={() => setType('practical')}
                  className={`p-4 rounded-lg border-2 transition ${
                    type === 'practical'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">💼</div>
                  <div className="font-semibold">Práctico</div>
                </button>
                <button
                  onClick={() => setType('mixed')}
                  className={`p-4 rounded-lg border-2 transition ${
                    type === 'mixed'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="font-semibold">Mixto</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!title.trim()}
                className={`px-8 py-3 rounded-lg font-bold transition ${
                  title.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Selección de Temas */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Paso 2 · Selección de Temas</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de temario
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTemarioType('general')}
                  className={`p-4 rounded-lg border-2 transition ${
                    temarioType === 'general'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">📘</div>
                  <div className="font-semibold text-sm">Solo General</div>
                </button>
                <button
                  onClick={() => setTemarioType('especifico')}
                  className={`p-4 rounded-lg border-2 transition ${
                    temarioType === 'especifico'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">📗</div>
                  <div className="font-semibold text-sm">Solo Específico</div>
                </button>
                <button
                  onClick={() => setTemarioType('ambos')}
                  className={`p-4 rounded-lg border-2 transition ${
                    temarioType === 'ambos'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">📚</div>
                  <div className="font-semibold text-sm">Ambos</div>
                </button>
              </div>
            </div>

            {/* Temas Generales */}
            {(temarioType === 'general' || temarioType === 'ambos') && (
              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">📘 Temas Generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                  {temasGenerales.map(tema => (
                    <button
                      key={tema.id}
                      onClick={() => toggleTema(tema.id)}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        selectedTemas.includes(tema.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {selectedTemas.includes(tema.id) && '✓ '}
                            Tema {tema.numero}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{tema.titulo}</div>
                        </div>
                        {tema._count && (
                          <div className="text-xs text-gray-500 ml-2">
                            {tema._count.preguntas} preguntas
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Temas Específicos */}
            {(temarioType === 'especifico' || temarioType === 'ambos') && (
              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-3">📗 Temas Específicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                  {temasEspecificos.map(tema => (
                    <button
                      key={tema.id}
                      onClick={() => toggleTema(tema.id)}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        selectedTemas.includes(tema.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {selectedTemas.includes(tema.id) && '✓ '}
                            Tema {tema.numero}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{tema.titulo}</div>
                        </div>
                        {tema._count && (
                          <div className="text-xs text-gray-500 ml-2">
                            {tema._count.preguntas} preguntas
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-4 pt-4 border-t">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedTemas.length === 0}
                className={`px-8 py-3 rounded-lg font-bold transition ${
                  selectedTemas.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Opciones avanzadas */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Paso 3 · Opciones Avanzadas</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nivel de dificultad
              </label>
              <div className="space-y-2">
                {['facil', 'media', 'dificil'].map(level => (
                  <label key={level} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={difficulty.includes(level)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDifficulty([...difficulty, level])
                        } else {
                          setDifficulty(difficulty.filter(d => d !== level))
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número de preguntas: <span className="text-blue-600">{questionCount}</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Distribución de preguntas
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={distribution === 'equitativa'}
                    onChange={() => setDistribution('equitativa')}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold">Equitativa</div>
                    <div className="text-xs text-gray-500">Igual cantidad por tema</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={distribution === 'proporcional'}
                    onChange={() => setDistribution('proporcional')}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold">Proporcional</div>
                    <div className="text-xs text-gray-500">Según preguntas disponibles</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Modo de selección
              </label>
              <div className="space-y-2">
                {[
                  { value: 'aleatoria', label: 'Aleatoria', desc: 'Selección random' },
                  { value: 'recientes', label: 'Más recientes', desc: 'Últimas añadidas' },
                  { value: 'menos_respondidas', label: 'Menos respondidas', desc: 'Priorizar menos vistas' }
                ].map(mode => (
                  <label key={mode.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={selectionMode === mode.value as any}
                      onChange={() => setSelectionMode(mode.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold">{mode.label}</div>
                      <div className="text-xs text-gray-500">{mode.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => {
                  setStep(4)
                  loadPreview()
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                Ver Vista Previa →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Vista previa */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Paso 4 · Vista Previa y Confirmación</h2>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-blue-900 mb-4">Resumen del Cuestionario</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Título:</span>
                  <div className="font-semibold">{title}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <div className="font-semibold capitalize">{type}</div>
                </div>
                <div>
                  <span className="text-gray-600">Temas seleccionados:</span>
                  <div className="font-semibold">{selectedTemas.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total preguntas:</span>
                  <div className="font-semibold">{questionCount}</div>
                </div>
                <div>
                  <span className="text-gray-600">Dificultad:</span>
                  <div className="font-semibold">{difficulty.join(', ')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Distribución:</span>
                  <div className="font-semibold capitalize">{distribution}</div>
                </div>
              </div>
            </div>

            {loadingPreview ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⏳</div>
                <p>Cargando vista previa...</p>
              </div>
            ) : previewQuestions.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3">Vista previa de preguntas</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {previewQuestions.slice(0, 10).map((q, idx) => (
                    <div key={q.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="font-semibold text-gray-800">
                        {idx + 1}. {q.text.substring(0, 100)}...
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {q.tema}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                  {previewQuestions.length > 10 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      ... y {previewQuestions.length - 10} preguntas más
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-4 pt-4 border-t">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                ← Modificar
              </button>
              <button
                onClick={handleCreateQuestionnaire}
                disabled={creating}
                className={`px-8 py-3 rounded-lg font-bold transition ${
                  creating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {creating ? 'Creando...' : '✓ Crear Cuestionario'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
