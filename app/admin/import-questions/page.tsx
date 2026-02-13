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
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResult, setBatchResult] = useState<any>(null)
  const [batchError, setBatchError] = useState('')
  const [markReviewed, setMarkReviewed] = useState(true)
  const [batchStatus, setBatchStatus] = useState<string>('')

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

      const res = await fetch(`/api/admin/questions/import?markReviewed=${markReviewed ? 'true' : 'false'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Enviamos el JSON tal cual está en el fichero;
        // el backend se encarga de normalizar los distintos formatos.
        body: text,
      })

      const resText = await res.text()
      let data: any = null

      try {
        data = resText ? JSON.parse(resText) : null
      } catch (e) {
        setError(
          `La respuesta de la API no es JSON válido (código ${res.status}). Inicio de la respuesta: "${resText.slice(
            0,
            200,
          )}"`,
        )
        return
      }

      if (res.ok) {
        setResult(data)
      } else {
        setError(data?.error || 'Error al importar')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
    } finally {
      setImporting(false)
    }
  }

  const handleBatchImport = async () => {
    setBatchRunning(true)
    setBatchError('')
    setBatchResult(null)
    setBatchStatus('')

    try {
      const limit = 1
      let offset = 0
      let totalCreated = 0
      let filesTotal: number | null = null
      const allDetails: any[] = []
      const allErrors: string[] = []

      for (let guard = 0; guard < 500; guard++) {
        setBatchStatus(
          filesTotal == null
            ? `⏳ Importando...`
            : `⏳ Importando ${Math.min(offset + limit, filesTotal)}/${filesTotal}...`,
        )

        const res = await fetch(
          `/api/admin/questions/import-from-json-files?offset=${offset}&limit=${limit}&markReviewed=${markReviewed ? 'true' : 'false'}`,
          { method: 'POST' },
        )

        const text = await res.text()
        let data: any = null

        try {
          data = text ? JSON.parse(text) : null
        } catch {
          setBatchError(
            `La respuesta de la API no es JSON válido (código ${res.status}). Inicio de la respuesta: "${text.slice(
              0,
              200,
            )}"`,
          )
          return
        }

        if (!res.ok) {
          setBatchError(data?.error || 'Error al importar desde JSON del servidor')
          return
        }

        if (typeof data?.filesTotal === 'number') filesTotal = data.filesTotal
        totalCreated += Number(data?.totalCreated || 0)
        if (Array.isArray(data?.details)) allDetails.push(...data.details)
        if (Array.isArray(data?.errors) && data.errors.length) allErrors.push(...data.errors)

        if (data?.done) {
          setBatchResult({
            success: allErrors.length === 0,
            filesProcessed: filesTotal ?? offset,
            filesTotal: filesTotal ?? offset,
            totalCreated,
            details: allDetails,
            errors: allErrors
          })
          setBatchStatus('')
          return
        }

        const nextOffset = Number(data?.nextOffset)
        if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
          setBatchError('La importación no avanzó (offset inválido).')
          return
        }
        offset = nextOffset
      }

      setBatchError('Se alcanzó el límite de iteraciones de importación. Reintenta.')
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Error al lanzar la importación en lote')
    } finally {
      setBatchRunning(false)
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
            <div className="mb-4 flex items-center justify-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={markReviewed}
                  onChange={(e) => setMarkReviewed(e.target.checked)}
                  disabled={importing}
                  className="w-4 h-4"
                />
                Marcar como revisadas (recomendado para JSON verificados)
              </label>
            </div>
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

          <div className="mt-8 border rounded-lg p-6 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Importar directamente desde los JSON del servidor</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Esta opción recorre todos los ficheros <span className="font-mono">TEMA*.json</span> que hay en el proyecto
              y los vuelca en la base de datos, igual que cuando ejecutas el comando en terminal.
            </p>
            <button
              onClick={handleBatchImport}
              disabled={batchRunning}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                batchRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {batchRunning ? '⏳ Importando temario...' : '🔄 Reimportar temario desde JSON del servidor'}
            </button>

            {batchRunning && batchStatus && (
              <div className="mt-3 text-sm text-gray-600">{batchStatus}</div>
            )}

            {batchError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-red-800 text-sm font-semibold">❌ {batchError}</p>
              </div>
            )}

            {batchResult && (
              <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-800 text-sm font-semibold mb-1">✅ Importación en lote completada</p>
                <p className="text-green-700 text-sm">
                  Ficheros procesados: {batchResult.filesProcessed} · Preguntas nuevas creadas: {batchResult.totalCreated}
                </p>
                {batchResult.errors && batchResult.errors.length > 0 && (
                  <p className="text-yellow-700 text-xs mt-2">
                    Avisos en algunos ficheros (revisa la consola de logs para más detalle).
                  </p>
                )}
              </div>
            )}
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
