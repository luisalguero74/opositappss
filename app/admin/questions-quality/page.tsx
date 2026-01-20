'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCorrectAnswerLetter } from '@/lib/answer-normalization'

interface PreguntaConProblemas {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string | null
  difficulty: string
  temaCodigo: string | null
  temaNumero: number | null
  temaTitulo: string | null
  puntuacion: number
  errores: string[]
  advertencias: string[]
}

interface Estadisticas {
  totalAnalizadas: number
  totalValidas: number
  totalInvalidas: number
  porcentajeValidas: number
  promedioCalidad: number
  distribucionPorPuntuacion: {
    criticas: number
    malas: number
    regulares: number
    buenas: number
  }
}

export default function QualityReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [preguntas, setPreguntas] = useState<PreguntaConProblemas[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [totalPreguntas, setTotalPreguntas] = useState(0)
  
  const [filters, setFilters] = useState({
    limit: 100,
    offset: 0,
    onlyProblems: true,
    minScore: 0,
    maxScore: 100
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'admin') {
      router.push('/')
    }
  }, [status, session, router])

  const analizarPreguntas = async (overrideFilters?: Partial<typeof filters>) => {
    const source = overrideFilters && Object.keys(overrideFilters).length > 0 ? overrideFilters : filters

    const f: typeof filters = {
      limit:
        typeof (source as any).limit === 'number' && !Number.isNaN((source as any).limit)
          ? (source as any).limit
          : 100,
      offset:
        typeof (source as any).offset === 'number' && !Number.isNaN((source as any).offset)
          ? (source as any).offset
          : 0,
      onlyProblems:
        typeof (source as any).onlyProblems === 'boolean'
          ? (source as any).onlyProblems
          : true,
      minScore:
        typeof (source as any).minScore === 'number' && !Number.isNaN((source as any).minScore)
          ? (source as any).minScore
          : 0,
      maxScore:
        typeof (source as any).maxScore === 'number' && !Number.isNaN((source as any).maxScore)
          ? (source as any).maxScore
          : 100
    }
    setAnalyzing(true)
    try {
      const params = new URLSearchParams({
        limit: f.limit.toString(),
        offset: f.offset.toString(),
        onlyProblems: f.onlyProblems.toString(),
        minScore: f.minScore.toString(),
        maxScore: f.maxScore.toString()
      })

      const response = await fetch(`/api/admin/review-questions?${params}`)
      const data = await response.json()

      if (data.success) {
        setEstadisticas(data.estadisticas)
        setPreguntas(data.preguntas)
        setTotalPreguntas(data.totalPreguntas)
      } else {
        alert('Error al analizar: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const aplicarFiltroRapido = (tipo: 'todas' | 'validas' | 'problematicas') => {
    const base = { ...filters }
    let nuevos: typeof filters

    if (tipo === 'todas') {
      nuevos = { ...base, minScore: 0, maxScore: 100, onlyProblems: false, offset: 0 }
    } else if (tipo === 'validas') {
      nuevos = { ...base, minScore: 80, maxScore: 100, onlyProblems: false, offset: 0 }
    } else {
      nuevos = { ...base, minScore: 0, maxScore: 59, onlyProblems: true, offset: 0 }
    }

    setFilters(nuevos)
    analizarPreguntas(nuevos)
  }

  const regenerarSeleccionadas = async () => {
    if (selectedQuestions.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }

    if (!confirm(`¿Regenerar explicaciones de ${selectedQuestions.size} preguntas?`)) {
      return
    }

    setLoading(true)
    try {
      const ids = Array.from(selectedQuestions)
      const chunkSize = 3

      let totalProcesadas = 0
      let totalExitosas = 0
      let totalFallidas = 0
      const errores: string[] = []

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)

        let response: Response
        try {
          response = await fetch('/api/admin/review-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionIds: chunk,
              action: 'regenerate',
              batchSize: chunk.length
            })
          })
        } catch (error: any) {
          throw new Error(
            `Error de red al contactar con /api/admin/review-questions. ` +
              `Suele ocurrir por timeout/corte de conexión. Prueba con menos preguntas. ` +
              `Detalle: ${error?.message || String(error)}`
          )
        }

        let data: any = null
        try {
          data = await response.json()
        } catch {
          // Ignorar parseo; se manejará por status
        }

        if (!response.ok || !data?.success) {
          const detail = data?.error || `HTTP ${response.status}`
          throw new Error(detail)
        }

        totalProcesadas += Number(data.procesadas || 0)
        totalExitosas += Number(data.exitosas || 0)
        totalFallidas += Number(data.fallidas || 0)
        if (Array.isArray(data.errores) && data.errores.length) {
          errores.push(...data.errores)
        }
      }

      alert(
        `✅ Proceso completado:\n- Procesadas: ${totalProcesadas}` +
          `\n- Exitosas: ${totalExitosas}` +
          `\n- Fallidas: ${totalFallidas}` +
          (errores.length ? `\n\nDetalles (primeros 5):\n- ${errores.slice(0, 5).join('\n- ')}` : '')
      )
      setSelectedQuestions(new Set())
      analizarPreguntas() // Reanalizar
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const eliminarSeleccionadas = async () => {
    if (selectedQuestions.size === 0) {
      alert('Selecciona al menos una pregunta')
      return
    }

    if (!confirm(`⚠️ ¿ELIMINAR ${selectedQuestions.size} preguntas? Esta acción NO se puede deshacer.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: Array.from(selectedQuestions),
          action: 'delete'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.deleted} preguntas eliminadas`)
        setSelectedQuestions(new Set())
        analizarPreguntas() // Reanalizar
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedQuestions)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedQuestions(newSet)
  }

  const seleccionarTodas = () => {
    if (selectedQuestions.size === preguntas.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(preguntas.map(p => p.id)))
    }
  }

  const getPuntuacionColor = (puntuacion: number) => {
    if (puntuacion < 40) return 'text-red-600 bg-red-50'
    if (puntuacion < 60) return 'text-orange-600 bg-orange-50'
    if (puntuacion < 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 font-semibold mb-3 inline-block"
          >
            
            
            
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Revisión de Calidad de Preguntas</h1>
          <p className="mt-2 text-gray-600">
            Analiza, valida y mejora las preguntas existentes en la base de datos
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros de Análisis</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={() => aplicarFiltroRapido('todas')}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => aplicarFiltroRapido('validas')}
              className="px-4 py-2 text-sm rounded-lg border border-green-300 text-green-700 hover:bg-green-50"
            >
              Válidas (≥ 80)
            </button>
            <button
              type="button"
              onClick={() => aplicarFiltroRapido('problematicas')}
              className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
            >
              Problemáticas (&lt; 60)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preguntas a analizar
              </label>
              <input
                type="number"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="10"
                max="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntuación mínima
              </label>
              <input
                type="number"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntuación máxima
              </label>
              <input
                type="number"
                value={filters.maxScore}
                onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.onlyProblems}
                onChange={(e) => setFilters({ ...filters, onlyProblems: e.target.checked })}
                className="rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Solo mostrar preguntas con problemas</span>
            </label>
          </div>

          <button
            onClick={analizarPreguntas}
            disabled={analyzing}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? 'Analizando...' : '🔍 Analizar Preguntas'}
          </button>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Estadísticas Generales</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{totalPreguntas}</div>
                <div className="text-sm text-gray-600">Total en BD</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{estadisticas.totalValidas}</div>
                <div className="text-sm text-gray-600">Válidas ({estadisticas.porcentajeValidas}%)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{estadisticas.totalInvalidas}</div>
                <div className="text-sm text-gray-600">Inválidas</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{estadisticas.promedioCalidad}</div>
                <div className="text-sm text-gray-600">Promedio /100</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{estadisticas.totalAnalizadas}</div>
                <div className="text-sm text-gray-600">Analizadas</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="p-3 bg-red-50 rounded">
                <div className="text-lg font-bold text-red-600">{estadisticas.distribucionPorPuntuacion.criticas}</div>
                <div className="text-xs text-gray-600">Críticas (&lt;40)</div>
              </div>
              <div className="p-3 bg-orange-50 rounded">
                <div className="text-lg font-bold text-orange-600">{estadisticas.distribucionPorPuntuacion.malas}</div>
                <div className="text-xs text-gray-600">Malas (40-59)</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <div className="text-lg font-bold text-yellow-600">{estadisticas.distribucionPorPuntuacion.regulares}</div>
                <div className="text-xs text-gray-600">Regulares (60-79)</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{estadisticas.distribucionPorPuntuacion.buenas}</div>
                <div className="text-xs text-gray-600">Buenas (80+)</div>
              </div>
            </div>
          </div>
        )}

        {/* Acciones en Lote */}
        {preguntas.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Acciones en Lote</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedQuestions.size} preguntas seleccionadas
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={seleccionarTodas}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {selectedQuestions.size === preguntas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
                <button
                  onClick={regenerarSeleccionadas}
                  disabled={loading || selectedQuestions.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  🔄 Regenerar Explicaciones
                </button>
                <button
                  onClick={eliminarSeleccionadas}
                  disabled={loading || selectedQuestions.size === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Preguntas */}
        <div className="space-y-4">
          {preguntas.map((pregunta) => (
            <div key={pregunta.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedQuestions.has(pregunta.id)}
                  onChange={() => toggleQuestion(pregunta.id)}
                  className="mt-1"
                />
                
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPuntuacionColor(pregunta.puntuacion)}`}>
                        {pregunta.puntuacion}/100
                      </span>
                      <span className="text-sm text-gray-600">
                        {pregunta.temaCodigo} - Tema {pregunta.temaNumero}
                      </span>
                      <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                        {pregunta.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/questions-review?questionId=${encodeURIComponent(pregunta.id)}`}
                        className="text-sm px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      >
                        ✏️ Editar
                      </Link>
                    </div>
                  </div>

                  {/* Pregunta */}
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-900">{pregunta.text}</h3>
                  </div>

                  {/* Opciones */}
                  <div className="mb-3 space-y-1">
                    {(() => {
                      const letter = getCorrectAnswerLetter(pregunta.correctAnswer, pregunta.options)
                      const correctLetter = letter ? letter.toUpperCase() : null
                      return pregunta.options.map((opcion, idx) => {
                        const optionLetter = ['A', 'B', 'C', 'D'][idx]
                        const isCorrect = correctLetter === optionLetter
                        return (
                          <div
                            key={idx}
                            className={`text-sm p-2 rounded ${
                              isCorrect ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            <strong>{optionLetter})</strong> {opcion}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Explicación */}
                  {pregunta.explanation && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700"><strong>Explicación:</strong></p>
                      <p className="text-sm text-gray-600 mt-1">{pregunta.explanation}</p>
                    </div>
                  )}

                  {/* Errores y Advertencias */}
                  {pregunta.errores.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-red-600">❌ Errores:</p>
                      <ul className="list-disc list-inside text-sm text-red-600 ml-2">
                        {pregunta.errores.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pregunta.advertencias.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-600">⚠️ Advertencias:</p>
                      <ul className="list-disc list-inside text-sm text-orange-600 ml-2">
                        {pregunta.advertencias.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {preguntas.length === 0 && !analyzing && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No hay preguntas para mostrar. Haz clic en "Analizar Preguntas" para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
