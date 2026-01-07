'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ImportQuestions() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
    router.push('/dashboard')
    return null
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')
    setResult(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json.data })
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Error al importar')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block font-semibold">
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📥 Importar Preguntas</h1>
          <p className="text-gray-600">Importa preguntas desde un archivo JSON exportado</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Instrucciones</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>En tu máquina local, ejecuta: <code className="bg-gray-100 px-2 py-1 rounded">node export-questions-local.mjs</code></li>
              <li>Se creará un archivo <code className="bg-gray-100 px-2 py-1 rounded">questions-export.json</code></li>
              <li>Sube ese archivo aquí para importarlo a producción</li>
            </ol>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className={`inline-block px-6 py-3 rounded-lg font-semibold cursor-pointer transition ${
                importing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {importing ? '⏳ Importando...' : '📁 Seleccionar Archivo JSON'}
            </label>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800 font-semibold">❌ {error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h3 className="text-green-800 font-bold mb-2">✅ Importación Exitosa</h3>
              <ul className="text-green-700 space-y-1">
                <li>Preguntas importadas: {result.imported}</li>
                <li>Cuestionarios creados: {result.questionnairesCreated}</li>
              </ul>
              <Link
                href="/admin/questions-review"
                className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Ver Preguntas →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
