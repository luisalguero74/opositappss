'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BulkQuestionsGenerator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loadingGeneral, setLoadingGeneral] = useState(false)
  const [loadingEspecifico, setLoadingEspecifico] = useState(false)
  const [loadingLgss, setLoadingLgss] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role?.toLowerCase() !== 'admin')) {
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

    const setLoading = categoria === 'general' ? setLoadingGeneral : categoria === 'especifico' ? setLoadingEspecifico : setLoadingLgss
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const parseJsonResponse = async (res: Response) => {
        const contentType = res.headers.get('content-type') || ''
        const rawText = await res.text()
        if (rawText && contentType.includes('application/json')) {
          try {
            return JSON.parse(rawText)
          } catch {
            throw new Error(
              `Respuesta inválida del servidor (JSON malformado). status=${res.status}. body=${rawText.slice(0, 300)}`
            )
          }
        }
        if (!rawText) {
          throw new Error(`Respuesta vacía del servidor. status=${res.status}`)
        }
        throw new Error(
          `Respuesta no-JSON del servidor. status=${res.status}. content-type=${contentType}. body=${rawText.slice(0, 300)}`
        )
      }

      const preguntasPorTema = categoria === 'lgss' ? 30 : 20

      // 1) Start: create/reuse questionnaire + get temasTotal
      const startRes = await fetch('/api/admin/generate-bulk-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'start',
          categoria,
          preguntasPorTema
        })
      })

      const startData = await parseJsonResponse(startRes)
      if (!startRes.ok) {
        const errorMsg = startData.error || 'Error al iniciar generación'
        const detailsMsg = startData.details ? `\nDetalles: ${startData.details}` : ''
        throw new Error(errorMsg + detailsMsg)
      }

      const questionnaireId = startData.questionnaireId as string
      const temasTotal = Number(startData.temasTotal ?? 0)
      if (!questionnaireId || !Number.isFinite(temasTotal) || temasTotal <= 0) {
        throw new Error('Respuesta inválida al iniciar la generación')
      }

      let temasProcesados = 0
      let preguntasGeneradas = 0

      // 2) Chunk loop
      if (categoria === 'lgss') {
        while (true) {
          const chunkRes = await fetch('/api/admin/generate-bulk-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              action: 'chunk',
              categoria,
              preguntasPorTema,
              questionnaireId,
              preguntasChunkSize: 5
            })
          })

          const chunkData = await parseJsonResponse(chunkRes)
          if (!chunkRes.ok) {
            const errorMsg = chunkData.error || 'Error al generar preguntas'
            const detailsMsg = chunkData.details ? `\nDetalles: ${chunkData.details}` : ''
            throw new Error(errorMsg + detailsMsg)
          }

          preguntasGeneradas = Number(chunkData.preguntasGeneradas ?? preguntasGeneradas)
          temasProcesados = Number(chunkData.temasProcesados ?? temasProcesados)

          setResult({
            questionnaireId,
            temasProcesados,
            preguntasGeneradas,
            temasTotal
          })

          if (chunkData.doneForTema) break
        }
      } else {
        for (let temaIndex = 0; temaIndex < temasTotal; temaIndex++) {
          while (true) {
            const chunkRes = await fetch('/api/admin/generate-bulk-questions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                action: 'chunk',
                categoria,
                preguntasPorTema,
                questionnaireId,
                temaIndex,
                preguntasChunkSize: 5
              })
            })

            const chunkData = await parseJsonResponse(chunkRes)
            if (!chunkRes.ok) {
              const errorMsg = chunkData.error || 'Error al generar preguntas'
              const detailsMsg = chunkData.details ? `\nDetalles: ${chunkData.details}` : ''
              throw new Error(errorMsg + detailsMsg)
            }

            const inserted = Number(chunkData.inserted ?? 0)
            if (Number.isFinite(inserted) && inserted > 0) {
              preguntasGeneradas += inserted
            }

            setResult({
              questionnaireId,
              temasProcesados,
              preguntasGeneradas,
              temasTotal
            })

            if (chunkData.doneForTema) {
              temasProcesados += 1
              setResult({
                questionnaireId,
                temasProcesados,
                preguntasGeneradas,
                temasTotal
              })
              break
            }
          }
        }
      }

      setResult({
        message: 'Generación masiva completada',
        questionnaireId,
        temasProcesados,
        preguntasGeneradas,
        temasTotal
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!session || !session.user || session.user.role?.toLowerCase() !== 'admin') {
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

        {/* Mostrar error siempre que exista */}
        {error !== '' && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>❌ Error</strong>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error}</pre>
          </div>
        )}

        {/* Botones de Generación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Temario General */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="text-white text-5xl mb-3 text-center">📘</div>
              <h2 className="text-2xl font-bold text-white text-center">Temario General</h2>
              <p className="text-blue-100 text-center mt-2">23 temas oficiales</p>
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
                disabled={loadingGeneral || loadingEspecifico || loadingLgss}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loadingGeneral ? '⏳ Generando...' : '🚀 Generar Temario General'}
              </button>
            </div>
          </div>

          {/* Temario Específico */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-green-200">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="text-white text-5xl mb-3 text-center">📕</div>
              <h2 className="text-2xl font-bold text-white text-center">Temario Específico</h2>
              <p className="text-green-100 text-center mt-2">13 temas oficiales</p>
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
                disabled={loadingGeneral || loadingEspecifico || loadingLgss}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loadingEspecifico ? '⏳ Generando...' : '🚀 Generar Temario Específico'}
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
                disabled={loadingGeneral || loadingEspecifico || loadingLgss}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loadingLgss ? '⏳ Generando...' : '🚀 Generar LGSS'}
              </button>
            </div>
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-green-800 mb-4">✅ Generación Completada</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{result.temasProcesados}</div>
                <div className="text-sm text-gray-600">Temas procesados</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{result.preguntasGeneradas}</div>
                <div className="text-sm text-gray-600">Preguntas creadas</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">{Math.round(result.preguntasGeneradas / result.temasProcesados)}</div>
                <div className="text-sm text-gray-600">Por tema (promedio)</div>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-orange-600">{result.temasTotal}</div>
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
