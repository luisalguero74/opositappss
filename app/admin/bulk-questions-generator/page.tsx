'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BulkQuestionsGenerator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
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
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/admin/generate-bulk-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoria,
          preguntasPorTema: categoria === 'lgss' ? 30 : 20
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar preguntas')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!session || !session.user || session.user.role !== 'admin') {
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
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '⏳ Generando...' : '🚀 Generar Temario General'}
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
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '⏳ Generando...' : '🚀 Generar Temario Específico'}
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
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '⏳ Generando...' : '🚀 Generar LGSS'}
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
