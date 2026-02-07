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
  explanation?: string
  createdAt?: string
  updatedAt?: string
  questionnaireId?: string
  questionnairePublished?: boolean | null
  questionnaireUpdatedAt?: string | null
  questionnaireName: string
  temaCodigo?: string | null
  temaNumero?: number | null
  temaTitulo?: string | null
  temaParte?: string | null
  difficulty?: string | null
  aiReviewed?: boolean
  aiReviewedAt?: string | null
}

export default function QuestionsDatabase() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'theory' | 'practical'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [correcting, setCorrecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' })

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
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

  const selectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))
    }
  }

  const applyCorrections = async () => {
    if (selectedQuestions.size === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos una pregunta' })
      return
    }

    if (!confirm(`¿Regenerar explicaciones de ${selectedQuestions.size} preguntas seleccionadas?\\n\\nEsto mejorará automáticamente las explicaciones usando IA con referencias legales correctas.`)) {
      return
    }

    setCorrecting(true)
    setMessage({ type: '', text: '' })

    try {
      const ids = Array.from(selectedQuestions)
      const chunkSize = 3

      let totalProcesadas = 0
      let totalExitosas = 0
      let totalFallidas = 0
      const errores: string[] = []

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        setMessage({
          type: '',
          text: `⏳ Procesando ${Math.min(i + chunk.length, ids.length)}/${ids.length}...`
        })

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

      setMessage({
        type: 'success',
        text:
          `✅ Correcciones aplicadas:\n- Procesadas: ${totalProcesadas}` +
          `\n- Exitosas: ${totalExitosas}` +
          `\n- Fallidas: ${totalFallidas}` +
          (errores.length ? `\n\nDetalles (primeros 5):\n- ${errores.slice(0, 5).join('\n- ')}` : '')
      })
      setSelectedQuestions(new Set())
      loadQuestions() // Recargar preguntas
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error: ' + error.message })
    } finally {
      setCorrecting(false)
    }
  }

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const filteredQuestions = questions.filter(q => {
    const matchesSearch =
        q.text.toLowerCase().includes(filter.toLowerCase()) ||
        q.questionnaireName.toLowerCase().includes(filter.toLowerCase()) ||
        (q.explanation || '').toLowerCase().includes(filter.toLowerCase()) ||
        (q.temaCodigo || '').toLowerCase().includes(filter.toLowerCase()) ||
        (q.temaTitulo || '').toLowerCase().includes(filter.toLowerCase())

    const createdAt = q.createdAt ? new Date(q.createdAt) : null
    const matchesDate =
      dateFilter === 'all'
        ? true
        : createdAt
          ? dateFilter === 'today'
            ? createdAt >= startOfToday && createdAt < startOfTomorrow
            : createdAt >= sevenDaysAgo
          : false

    const name = q.questionnaireName.toLowerCase()
    const isTheoryByName = name.includes('tema')
    const isPracticalByName = name.includes('práctico') || name.includes('practico')

    const isTheoryByTemaMeta = !!(q.temaCodigo || q.temaNumero)

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'theory' && (isTheoryByName || isTheoryByTemaMeta)) ||
      (typeFilter === 'practical' && isPracticalByName)

    return matchesSearch && matchesType && matchesDate
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando base de datos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-2 inline-block">
            ← Volver al Panel de Administración
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📚 Base de Datos de Preguntas</h1>
              <p className="text-gray-600 mt-1">Todas las preguntas de test de temario y supuestos prácticos</p>
            </div>
            <Link 
              href="/admin/questions-quality"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold shadow-lg"
            >
              ✨ Control de Calidad
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
            <div className="text-sm text-gray-600">Total Preguntas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-green-600">
              {questions.filter(q => !!(q.temaCodigo || q.temaNumero || q.temaTitulo)).length}
            </div>
            <div className="text-sm text-gray-600">Test de Temario</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-purple-600">
              {questions.filter(q => q.questionnaireName.toLowerCase().includes('práctico') || q.questionnaireName.toLowerCase().includes('practico')).length}
            </div>
            <div className="text-sm text-gray-600">Supuestos Prácticos</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Buscar</label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar por pregunta, explicación, tema o cuestionario..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todos</option>
                <option value="theory">Test de Temario</option>
                <option value="practical">Supuestos Prácticos</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Fecha</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todas</option>
                <option value="today">Hoy</option>
                <option value="last7">Últimos 7 días</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setFilter('')
                setTypeFilter('all')
                setDateFilter('all')
                setSelectedQuestions(new Set())
              }}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Acciones en Lote */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🎯</span>
                <span>Acciones en Lote</span>
              </h2>
              <p className="text-gray-600 mt-1">
                {selectedQuestions.size === 0 
                  ? 'Selecciona preguntas para aplicar correcciones automáticas'
                  : `${selectedQuestions.size} pregunta${selectedQuestions.size > 1 ? 's' : ''} seleccionada${selectedQuestions.size > 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={selectAll}
                className="px-5 py-2.5 bg-white border-2 border-purple-600 text-purple-700 rounded-lg hover:bg-purple-50 transition font-semibold"
              >
                {selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0
                  ? '❌ Deseleccionar Todas' 
                  : '✅ Seleccionar Todas'}
              </button>
              <button
                onClick={applyCorrections}
                disabled={correcting || selectedQuestions.size === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {correcting 
                  ? '⏳ Aplicando Correcciones...' 
                  : '✨ Aplicar Correcciones Automáticas'}
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 border-2 border-green-300 text-green-800' 
                : 'bg-red-100 border-2 border-red-300 text-red-800'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>💡 Cómo funciona:</strong> Las correcciones automáticas regeneran las explicaciones de las preguntas seleccionadas usando IA con:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>✅ Referencias legales correctas (Artículos, Leyes, RDL)</li>
              <li>✅ Citas textuales de los artículos</li>
              <li>✅ Explicación de por qué cada opción es correcta o incorrecta</li>
              <li>✅ Formato profesional y preciso</li>
            </ul>
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0}
                      onChange={selectAll}
                      className="w-5 h-5 rounded cursor-pointer"
                      title="Seleccionar todas"
                    />
                  </th>
                  <th className="text-left py-4 px-6 font-semibold">Fecha</th>
                  <th className="text-left py-4 px-6 font-semibold">Cuestionario</th>
                  <th className="text-left py-4 px-6 font-semibold">Pregunta</th>
                  <th className="text-left py-4 px-6 font-semibold">Opciones</th>
                  <th className="text-left py-4 px-6 font-semibold">Respuesta Correcta</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q, idx) => (
                  <tr 
                    key={q.id} 
                    className={`border-b transition-colors ${
                      selectedQuestions.has(q.id) 
                        ? 'bg-blue-50 border-blue-200' 
                        : idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-purple-50`}
                  >
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-sm text-gray-800 font-medium">
                        {q.createdAt
                          ? new Date(q.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {q.createdAt
                          ? new Date(q.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : ''}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-purple-600">{q.questionnaireName}</span>
                      {q.questionnairePublished === false && (
                        <div className="text-xs text-gray-500 mt-1">No publicado</div>
                      )}
                      {q.temaCodigo && (
                        <div className="text-xs text-gray-500 mt-1">
                          {q.temaCodigo} - Tema {q.temaNumero}
                        </div>
                      )}
                      {q.aiReviewed && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-semibold border border-green-300">
                            <span>✨</span>
                            <span>Revisada por IA</span>
                          </span>
                          {q.aiReviewedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(q.aiReviewedAt).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-800">{q.text}</p>
                      {q.explanation && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                            Ver explicación
                          </summary>
                          <p className="text-xs text-gray-600 mt-1 p-2 bg-blue-50 rounded">
                            {q.explanation}
                          </p>
                        </details>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <ul className="text-sm text-gray-600 space-y-1">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={
                              opt === q.correctAnswer
                                ? 'px-2 py-1 rounded border border-green-200 bg-green-50 text-green-800 font-semibold'
                                : 'px-2 py-1 rounded'
                            }
                          >
                            {String.fromCharCode(65 + i)}) {opt}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {q.correctAnswer}
                      </span>
                      {q.difficulty && (
                        <div className="text-xs text-gray-500 mt-2">
                          {q.difficulty}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      No se encontraron preguntas con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-600">
          Mostrando {filteredQuestions.length} de {questions.length} preguntas
          {selectedQuestions.size > 0 && (
            <span className="ml-2 text-blue-600 font-semibold">
              • {selectedQuestions.size} seleccionadas
            </span>
          )}
        </div>

        {/* Crear manualmente */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-emerald-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>➕</span>
                <span>Crear Pregunta Manualmente</span>
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Añade una pregunta individual al banco oficial sin usar JSON ni generadores masivos.
              </p>
            </div>
            <Link
              href="/admin/questions-create"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 shadow"
            >
              Ir a alta manual →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
