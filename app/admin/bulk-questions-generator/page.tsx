'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function BulkQuestionsGenerator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'general' | 'especifico' | 'lgss' | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const preguntasGeneradasDisplay = (() => {
    const direct = Number(result?.preguntasGeneradas)
    if (Number.isFinite(direct) && direct >= 0) return direct
    const perTopic = Array.isArray(result?.preguntasPorTema)
      ? result.preguntasPorTema.reduce((acc: number, t: any) => acc + Number(t?.preguntasCreadas ?? 0), 0)
      : 0
    return Number.isFinite(perTopic) ? perTopic : 0
  })()

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const handleGenerate = async (categoria: 'general' | 'especifico' | 'lgss') => {
    const categoryNames = {
      'general': 'GENERAL',
      'especifico': 'ESPECÍFICO',
      'lgss': 'LGSS (RDL 8/2015)'
    }
    
    if (!confirm(`¿Generar preguntas sobre ${categoryNames[categoria]}?\n\nEsto puede tardar varios minutos.`)) {
      return
    }

    setLoading(true)
    setActiveCategory(categoria)
    setError('')
    setResult(null)

    try {
      const preguntasPorTema = categoria === 'lgss' ? 30 : 20

      // LGSS se procesa en una sola petición
      if (categoria === 'lgss') {
        const res = await fetch('/api/admin/generate-bulk-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoria, preguntasPorTema })
        })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
              throw new Error(data?.details || data?.error || 'Error al generar preguntas')
        }
        setResult({
          ...data,
          temasProcesados: data?.temasProcesados ?? 0,
          temasTotal: data?.temasTotal ?? 1,
          preguntasGeneradas: data?.preguntasGeneradas ?? 0
        })
        if (Number(data?.preguntasGeneradas ?? 0) === 0) {
          throw new Error('No se crearon preguntas (0). Revisa el detalle por tema o la configuración de Groq.')
        }
        return
      }

      // General/Específico: procesar por lotes pequeños (por tema) para evitar timeouts/rate limits
      const temas = TEMARIO_OFICIAL.filter(t => t.categoria === categoria)
      const temaIds = temas.map(t => t.id)
      const batches = chunkArray(temaIds, 1)

      let questionnaireId: string | undefined
      let temasProcesadosTotal = 0
      let preguntasGeneradasTotal = 0

      // Pintar contadores desde el inicio
      setResult({
        success: true,
        message: `Generación en progreso para ${categoria}`,
        questionnaireId: undefined,
        temasProcesados: 0,
        temasTotal: temaIds.length,
        preguntasGeneradas: 0
      })

      for (const batch of batches) {
        try {
          const res = await fetch('/api/admin/generate-bulk-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoria,
              preguntasPorTema,
              questionnaireId,
              temaIds: batch
            })
          })

          const data = await res.json().catch(() => ({ error: 'Error al parsear respuesta' }))
          
          if (!res.ok) {
            const msg = data?.details ? `${data.error || 'Error al generar preguntas'}: ${data.details}` : (data.error || 'Error al generar preguntas')
            console.error('Error en batch:', batch, msg)
            throw new Error(msg)
          }

          questionnaireId = data?.questionnaireId ?? questionnaireId
          temasProcesadosTotal += Number(data?.temasProcesados ?? 0)
          preguntasGeneradasTotal += Number(data?.preguntasGeneradas ?? 0)

          setResult({
            success: true,
            message: `Generación en progreso para ${categoria}`,
            questionnaireId,
            temasProcesados: temasProcesadosTotal,
            temasTotal: temaIds.length,
            preguntasGeneradas: preguntasGeneradasTotal
          })

          // Pausa pequeña para ser amable con el proveedor
          await sleep(400)
        } catch (batchError) {
          console.error('Error procesando batch:', batch, batchError)
          // Continuar con el siguiente tema en vez de abortar todo
          const errorMsg = batchError instanceof Error ? batchError.message : String(batchError)
          console.warn(`Saltando tema ${batch[0]} por error: ${errorMsg}`)
          continue
        }
      }

      setResult({
        success: true,
        message: `Generación completada para ${categoria}`,
        questionnaireId,
        temasProcesados: temasProcesadosTotal,
        temasTotal: temaIds.length,
        preguntasGeneradas: preguntasGeneradasTotal
      })
          if (preguntasGeneradasTotal === 0) {
            throw new Error('No se crearon preguntas (0). Revisa el detalle por tema o la configuración de Groq.')
          }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
      setActiveCategory(null)
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-violet-600 hover:text-violet-800 mb-4 inline-block font-semibold">
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🤖 Generador Masivo de Preguntas</h1>
          <p className="text-gray-600">Genera preguntas automáticamente para todo el temario con IA</p>
        </div>

        {/* Botones de Generación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Temario General */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="text-white text-5xl mb-3 text-center">📘</div>
              <h2 className="text-2xl font-bold text-white text-center">Temario General</h2>
              <p className="text-blue-100 text-center mt-2">{TEMARIO_OFICIAL.filter(t => t.categoria === 'general').length} temas oficiales</p>
            </div>
            <div className="p-6">
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li>✅ 20 preguntas por tema</li>
                <li>✅ 4 opciones de respuesta</li>
                <li>✅ 3 niveles de dificultad</li>
                <li>✅ Explicaciones completas</li>
                <li>✅ Vinculación automática</li>
              </ul>
              <button
                onClick={() => handleGenerate('general')}
                disabled={loading}
                className={`w-full py-3 font-bold rounded-lg transition ${
                  activeCategory === 'general'
                    ? 'bg-blue-700 text-white cursor-wait'
                    : loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                }`}
              >
                {activeCategory === 'general' ? '⏳ Generando...' : '🚀 Generar Temario General'}
              </button>
            </div>
          </div>

          {/* Temario Específico */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-green-200">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="text-white text-5xl mb-3 text-center">📕</div>
              <h2 className="text-2xl font-bold text-white text-center">Temario Específico</h2>
              <p className="text-green-100 text-center mt-2">{TEMARIO_OFICIAL.filter(t => t.categoria === 'especifico').length} temas oficiales</p>
            </div>
            <div className="p-6">
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li>✅ 20 preguntas por tema</li>
                <li>✅ 4 opciones de respuesta</li>
                <li>✅ 3 niveles de dificultad</li>
                <li>✅ Explicaciones completas</li>
                <li>✅ Vinculación automática</li>
              </ul>
              <button
                onClick={() => handleGenerate('especifico')}
                disabled={loading}
                className={`w-full py-3 font-bold rounded-lg transition ${
                  activeCategory === 'especifico'
                    ? 'bg-green-700 text-white cursor-wait'
                    : loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                }`}
              >
                {activeCategory === 'especifico' ? '⏳ Generando...' : '🚀 Generar Temario Específico'}
              </button>
            </div>
          </div>

          {/* LGSS RDL 8/2015 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-purple-200">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
              <div className="text-white text-5xl mb-3 text-center">⚖️</div>
              <h2 className="text-2xl font-bold text-white text-center">LGSS RDL 8/2015</h2>
              <p className="text-purple-100 text-center mt-2">Ley General Seguridad Social</p>
            </div>
            <div className="p-6">
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li>✅ 30 preguntas específicas</li>
                <li>✅ 4 opciones de respuesta</li>
                <li>✅ 3 niveles de dificultad</li>
                <li>✅ Artículos y normativa</li>
                <li>✅ Aplicación práctica</li>
              </ul>
              <button
                onClick={() => handleGenerate('lgss')}
                disabled={loading}
                className={`w-full py-3 font-bold rounded-lg transition ${
                  activeCategory === 'lgss'
                    ? 'bg-purple-700 text-white cursor-wait'
                    : loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                }`}
              >
                {activeCategory === 'lgss' ? '⏳ Generando...' : '🚀 Generar LGSS'}
              </button>
            </div>
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-green-800 mb-4">
              {loading || String(result?.message || '').toLowerCase().includes('progreso')
                ? '⏳ Generación en progreso'
                : '✅ Generación Completada'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{result.temasProcesados ?? 0}</div>
                <div className="text-sm text-gray-600">Temas procesados</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{preguntasGeneradasDisplay}</div>
                <div className="text-sm text-gray-600">Preguntas creadas</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">{
                  (result.temasProcesados ?? 0) > 0
                    ? Math.round((preguntasGeneradasDisplay ?? 0) / (result.temasProcesados ?? 1))
                    : 0
                }</div>
                <div className="text-sm text-gray-600">Por tema (promedio)</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-orange-600">{result.temasTotal ?? 0}</div>
                <div className="text-sm text-gray-600">Temas totales</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/admin/questions-review"
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition text-center font-semibold"
              >
                📋 Revisar Preguntas
              </Link>
              <Link 
                href="/admin/preview-forms"
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition text-center font-semibold"
              >
                👁️ Ver Cuestionarios
              </Link>
            </div>

            {Array.isArray(result?.preguntasPorTema) && result.preguntasPorTema.length > 0 && (
              <div className="mt-5 bg-white rounded-lg p-4 border border-green-200">
                <div className="text-sm font-semibold text-gray-800 mb-2">Detalle por tema</div>
                <div className="max-h-56 overflow-auto text-sm">
                  {result.preguntasPorTema
                    .slice()
                    .sort((a: any, b: any) => Number(a?.temaNumero ?? 0) - Number(b?.temaNumero ?? 0))
                    .map((t: any) => (
                      <div key={String(t?.temaId ?? t?.temaNumero)} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                        <div className="text-gray-700">Tema {t?.temaNumero}: {t?.temaTitulo}</div>
                        <div className="font-semibold text-gray-900">{Number(t?.preguntasCreadas ?? 0)}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-red-800 mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Información */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-800 mb-3">ℹ️ Información Importante</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• <strong>Tiempo estimado:</strong> 10-15 minutos para todo el temario</li>
            <li>• <strong>API requerida:</strong> Necesitas GROQ_API_KEY configurada en .env</li>
            <li>• <strong>Preguntas por tema:</strong> 20 preguntas automáticas</li>
            <li>• <strong>Distribución:</strong> 40% fácil, 40% media, 20% difícil</li>
            <li>• <strong>Estado inicial:</strong> No publicadas (debes revisarlas primero)</li>
            <li>• <strong>Duplicados:</strong> Solo genera para temas sin preguntas previas</li>
            <li>• <strong>Siguiente paso:</strong> Ir a "Revisar Preguntas" para editar y publicar</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
