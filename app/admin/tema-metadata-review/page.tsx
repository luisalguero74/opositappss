'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TODOS_LOS_TEMAS } from '@/lib/temario'

type ReviewRow = {
  questionnaireId: string
  questionnaireTitle: string
  questionnaireTheme: string | null
  questionnaireType: string
  totalQuestions: number
  missingTemaCodigo: number
  missingTemaParte: number
  missingTemaTitulo: number
  samples: Array<{
    id: string
    createdAt: string
    textSnippet: string
    temaCodigo: string | null
    temaNumero: number | null
    temaParte: string | null
    temaTitulo: string | null
  }>
}

export default function AdminTemaMetadataReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [selectedTemaByQuestionnaire, setSelectedTemaByQuestionnaire] = useState<Record<string, string>>({})
  const [overwriteByQuestionnaire, setOverwriteByQuestionnaire] = useState<Record<string, boolean>>({})

  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String((session as any).user?.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  const temaOptions = useMemo(() => {
    const general = TODOS_LOS_TEMAS.filter((t) => t.parte === 'GENERAL')
    const especifico = TODOS_LOS_TEMAS.filter((t) => t.parte === 'ESPECÍFICO')

    return {
      general,
      especifico
    }
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tema-metadata-review?limit=80')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Error cargando datos')
      }

      const data = await res.json()
      const r = Array.isArray(data?.rows) ? (data.rows as ReviewRow[]) : []
      setRows(r)

      // Preselección desde questionnaireTheme si ya parece un código
      setSelectedTemaByQuestionnaire((prev) => {
        const next = { ...prev }
        for (const row of r) {
          if (!next[row.questionnaireId] && row.questionnaireTheme) {
            const normalized = String(row.questionnaireTheme || '').trim().toUpperCase().replace(/\s+/g, '')
            if (/^[GE]\d{1,2}$/.test(normalized) || /^[GE]\d{2}$/.test(normalized)) {
              next[row.questionnaireId] = normalized.length === 2 ? normalized : normalized
            }
          }
        }
        return next
      })

      setMessage({ type: '', text: '' })
    } catch (e: any) {
      setError(e?.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function applyTema(row: ReviewRow) {
    const temaCodigo = String(selectedTemaByQuestionnaire[row.questionnaireId] || '').trim()
    const overwrite = Boolean(overwriteByQuestionnaire[row.questionnaireId])

    if (!temaCodigo) {
      setMessage({ type: 'error', text: 'Selecciona un tema antes de aplicar.' })
      return
    }

    const confirmMsg = overwrite
      ? `¿Asignar ${temaCodigo} a TODAS las preguntas de este cuestionario (sobrescribe metadatos existentes)?`
      : `¿Asignar ${temaCodigo} a las preguntas sin tema de este cuestionario (solo rellena vacíos)?`

    if (!confirm(confirmMsg)) return

    setBusyId(row.questionnaireId)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/tema-metadata-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaireId: row.questionnaireId,
          temaCodigo,
          overwrite
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Error aplicando cambios')
      }

      setMessage({
        type: 'success',
        text: `✅ Actualizadas ${data?.updated ?? 0} preguntas (tema ${temaCodigo}).`
      })

      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Error desconocido' })
    } finally {
      setBusyId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <Link href="/admin" className="mb-4 text-blue-600 hover:text-blue-800 inline-block">
            ← Volver a Administración
          </Link>

          <div className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl p-8 shadow-2xl text-white">
            <div className="text-5xl mb-3">🏷️</div>
            <h1 className="text-3xl font-bold">Revisión de Temas (preguntas)</h1>
            <p className="text-white/90 mt-2 max-w-3xl">
              Lista de cuestionarios con preguntas sin metadatos de tema. Revisa muestras y asigna un tema oficial para poder
              ordenar/filtrar por temario.
            </p>
          </div>
        </div>

        {message.text && (
          <div
            className={
              message.type === 'success'
                ? 'mb-6 bg-green-100 border border-green-300 text-green-800 p-4 rounded-xl'
                : message.type === 'error'
                  ? 'mb-6 bg-red-100 border border-red-300 text-red-800 p-4 rounded-xl'
                  : 'mb-6 bg-gray-100 border border-gray-300 text-gray-800 p-4 rounded-xl'
            }
          >
            {message.text}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-800 p-4 rounded-xl">{error}</div>
        )}

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-gray-700">No hay cuestionarios pendientes. ✅</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const selectedTema = selectedTemaByQuestionnaire[row.questionnaireId] || ''
              const overwrite = Boolean(overwriteByQuestionnaire[row.questionnaireId])
              const busy = busyId === row.questionnaireId

              return (
                <div key={row.questionnaireId} className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-[260px]">
                        <div className="text-xs text-gray-500">{row.questionnaireId}</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">{row.questionnaireTitle}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Tipo: <span className="font-semibold">{row.questionnaireType}</span>
                          {row.questionnaireTheme ? (
                            <>
                              {' '}· Tema: <span className="font-semibold">{row.questionnaireTheme}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                          <div className="font-semibold">Preguntas</div>
                          <div>{row.totalQuestions}</div>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm">
                          <div className="font-semibold">Falta temaCodigo</div>
                          <div>{row.missingTemaCodigo}</div>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm">
                          <div className="font-semibold">Falta temaParte</div>
                          <div>{row.missingTemaParte}</div>
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm">
                          <div className="font-semibold">Falta temaTitulo</div>
                          <div>{row.missingTemaTitulo}</div>
                        </div>
                      </div>
                    </div>

                    {row.samples.length > 0 && (
                      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="text-sm font-semibold text-gray-800 mb-2">Muestras (últimas {row.samples.length})</div>
                        <ul className="space-y-2">
                          {row.samples.map((s) => (
                            <li key={s.id} className="text-sm text-gray-700">
                              <div className="text-xs text-gray-500 mb-1">{new Date(s.createdAt).toLocaleString()}</div>
                              <div className="leading-relaxed">{s.textSnippet}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Asignar tema</label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={selectedTema}
                          onChange={(e) =>
                            setSelectedTemaByQuestionnaire((prev) => ({
                              ...prev,
                              [row.questionnaireId]: e.target.value
                            }))
                          }
                        >
                          <option value="">Selecciona…</option>
                          <optgroup label="Temario General">
                            {temaOptions.general.map((t) => (
                              <option key={t.codigo} value={t.codigo}>
                                {t.codigo} · Tema {String(t.numero).padStart(2, '0')}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Temario Específico">
                            {temaOptions.especifico.map((t) => (
                              <option key={t.codigo} value={t.codigo}>
                                {t.codigo} · Tema {String(t.numero).padStart(2, '0')}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                          Rellena: temaCodigo/temaNumero/temaParte/temaTitulo.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`overwrite-${row.questionnaireId}`}
                          type="checkbox"
                          checked={overwrite}
                          onChange={(e) =>
                            setOverwriteByQuestionnaire((prev) => ({
                              ...prev,
                              [row.questionnaireId]: e.target.checked
                            }))
                          }
                        />
                        <label htmlFor={`overwrite-${row.questionnaireId}`} className="text-sm text-gray-700">
                          Sobrescribir metadatos existentes
                        </label>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => applyTema(row)}
                          disabled={busy}
                          className={
                            busy
                              ? 'px-5 py-2 bg-gray-300 text-gray-600 font-semibold rounded-lg cursor-not-allowed'
                              : 'px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition'
                          }
                        >
                          {busy ? 'Aplicando…' : 'Aplicar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-xs text-gray-500">
          Nota: Para imports tipo “Importado - 80 preguntas”, normalmente tendrás que asignar el tema manualmente aquí.
        </div>
      </div>
    </div>
  )
}
