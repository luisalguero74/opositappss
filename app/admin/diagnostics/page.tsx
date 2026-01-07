'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Diagnostics() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      runDiagnostics()
    }
  }, [status, session, router])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/diagnostics')
      const data = await res.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block font-semibold">
            ← Volver al Panel Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">🔍 Diagnóstico del Sistema</h1>
              <p className="text-gray-600">Verificación de conexiones y servicios</p>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading ? '⏳ Verificando...' : '🔄 Verificar de nuevo'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Ejecutando diagnósticos...</p>
          </div>
        )}

        {!loading && diagnostics && (
          <div className="space-y-6">
            {/* Resumen */}
            <div className={`rounded-lg shadow-lg p-6 ${
              diagnostics.summary?.allGreen ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
            }`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                {diagnostics.summary?.allGreen ? '✅' : '❌'}
                {diagnostics.summary?.allGreen ? 'Sistema Operativo' : 'Problemas Detectados'}
              </h2>
              {!diagnostics.summary?.allGreen && diagnostics.summary?.issues?.length > 0 && (
                <ul className="space-y-2">
                  {diagnostics.summary.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-red-800 font-semibold">⚠️ {issue}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Base de Datos */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {diagnostics.checks?.database?.connected ? '✅' : '❌'}
                Base de Datos
              </h3>
              {diagnostics.checks?.database?.connected ? (
                <div className="space-y-2 text-sm">
                  <p>✓ Conectada correctamente</p>
                  <p>Tiempo de respuesta: <span className="font-semibold">{diagnostics.checks.database.responseTime}</span></p>
                  <p>Preguntas en BD: <span className="font-semibold">{diagnostics.checks.database.questionCount}</span></p>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
                  <p className="text-red-800 font-semibold">Error:</p>
                  <p className="text-red-700 text-sm">{diagnostics.checks?.database?.error}</p>
                </div>
              )}
            </div>

            {/* Groq API */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {diagnostics.checks?.groq?.connected ? '✅' : '❌'}
                API de Groq (IA)
              </h3>
              {diagnostics.checks?.groq?.connected ? (
                <div className="space-y-2 text-sm">
                  <p>✓ Conectada correctamente</p>
                  <p>Tiempo de respuesta: <span className="font-semibold">{diagnostics.checks.groq.responseTime}</span></p>
                  <p>Modelo: <span className="font-semibold">{diagnostics.checks.groq.model}</span></p>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
                  <p className="text-red-800 font-semibold">Error:</p>
                  <p className="text-red-700 text-sm">{diagnostics.checks?.groq?.error}</p>
                </div>
              )}
            </div>

            {/* Variables de Entorno */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">🔐 Variables de Entorno</h3>
              <div className="space-y-2 text-sm">
                <p>GROQ_API_KEY: {diagnostics.checks?.env?.GROQ_API_KEY ? '✅ Configurada' : '❌ No configurada'}</p>
                <p>DATABASE_URL: {diagnostics.checks?.env?.DATABASE_URL ? '✅ Configurada' : '❌ No configurada'}</p>
              </div>
            </div>

            {/* Sistema */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">💻 Sistema</h3>
              <div className="space-y-2 text-sm">
                <p>Node.js: {diagnostics.checks?.system?.nodeVersion}</p>
                <p>Plataforma: {diagnostics.checks?.system?.platform}</p>
                <p>Memoria (Heap): {diagnostics.checks?.system?.memory?.heapUsed} / {diagnostics.checks?.system?.memory?.heapTotal}</p>
              </div>
            </div>

            {/* Timestamp */}
            <p className="text-center text-sm text-gray-500">
              Última verificación: {new Date(diagnostics.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
