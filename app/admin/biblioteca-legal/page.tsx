'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface DocumentoLegal {
  id: string
  nombre: string
  archivo: string
  tipo: string
  numeroPaginas: number
  fechaActualizacion: string
}

interface BibliotecaData {
  documentos: DocumentoLegal[]
  relaciones: { [temaId: string]: string[] }
}

export default function BibliotecaLegalPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [biblioteca, setBiblioteca] = useState<BibliotecaData>({ documentos: [], relaciones: {} })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  async function extractPdfTextInBrowser(file: File): Promise<{ text: string; pages: number }> {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf')) as any
    try {
      // Required by pdfjs in some bundler setups.
      // Use local worker from pdfjs-dist package.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
    } catch {
      // Best-effort: if workerSrc cannot be set, pdfjs may still work in no-worker mode.
    }
    const data = new Uint8Array(await file.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data, disableWorker: true })
    const pdf = await loadingTask.promise
    const totalPages = Number(pdf?.numPages ?? 0)
    const pagesToProcess = totalPages

    let out = ''
    for (let pageIndex = 1; pageIndex <= pagesToProcess; pageIndex++) {
      const page = await pdf.getPage(pageIndex)
      const textContent = await page.getTextContent()
      const items = Array.isArray(textContent?.items) ? textContent.items : []
      const pageText = items
        .map((it: any) => String(it?.str ?? ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (pageText) {
        out += `\n\n[Página ${pageIndex}/${pagesToProcess}]\n${pageText}`
      }
    }

    return { text: out.trim(), pages: totalPages }
  }

  async function uploadPdfAsTextFallback(file: File) {
    const { text, pages } = await extractPdfTextInBrowser(file)

    if (!text) {
      throw new Error(
        `El PDF ${file.name} parece no tener texto seleccionable. ` +
          `Si es un escaneo, conviene convertirlo a texto (OCR) o dividirlo antes de subirlo.`
      )
    }

    const res = await fetch('/api/biblioteca-legal/upload-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: 'ley',
        reference: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileSize: file.size,
        pageCount: pages,
        // keep payload bounded; backend also truncates
        content: text.slice(0, 250_000)
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const requestId = data?.requestId ? ` (requestId: ${data.requestId})` : ''
      throw new Error(String(data?.error || 'Error al subir texto') + requestId)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      } else if (String(session?.user?.role || '').toLowerCase() !== 'admin') {
      router.push('/')
    } else {
      cargarBiblioteca()
    }
  }, [status, session])

  async function cargarBiblioteca() {
    try {
      const res = await fetch('/api/biblioteca-legal', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        const requestId = data?.requestId ? ` (requestId: ${data.requestId})` : ''
        throw new Error((data?.error ? String(data.error) : 'Error al cargar biblioteca') + requestId)
      }

      setBiblioteca({
        documentos: Array.isArray(data?.documentos) ? data.documentos : [],
        relaciones: data?.relaciones && typeof data.relaciones === 'object' ? data.relaciones : {}
      })
      setLoadError(null)
    } catch (error) {
      console.error('Error al cargar biblioteca:', error)
      setLoadError(error instanceof Error ? error.message : 'Error al cargar biblioteca')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)

        // Subir archivo primero
        const uploadRes = await fetch('/api/biblioteca-legal/upload', {
          method: 'POST',
          body: formData
        })

        // Si Vercel devuelve 413, normalmente la respuesta no es JSON.
        // Hacemos fallback: extraer texto en el navegador y subir solo el texto.
        if (uploadRes.status === 413) {
          await uploadPdfAsTextFallback(file)
          setUploadProgress(Math.round(((i + 1) / files.length) * 100))
          continue
        }

        let uploadData = null
        try {
          uploadData = await uploadRes.json()
        } catch (e) {
          if (uploadRes.status === 413 && file.type === 'application/pdf') {
            await uploadPdfAsTextFallback(file)
            setUploadProgress(Math.round(((i + 1) / files.length) * 100))
            continue
          }
          // Si la respuesta no es JSON
          throw new Error(`Error inesperado al subir ${file.name} (HTTP ${uploadRes.status})`)
        }

        if (!uploadRes.ok) {
          const stage = uploadData?.stage ? ` (stage: ${uploadData.stage})` : ''
          const requestId = uploadData?.requestId ? ` (requestId: ${uploadData.requestId})` : ''
          const code = uploadData?.prismaCode ? ` (code: ${uploadData.prismaCode})` : ''
          const details = uploadData?.details ? ` (details: ${uploadData.details})` : ''
          throw new Error(
            uploadData?.error
              ? `Error al subir ${file.name}: ${uploadData.error}${stage}${requestId}${code}${details}`
              : `Error al subir ${file.name}${stage}${requestId}${code}${details}`
          )
        }

        // Si el endpoint de upload ya crea el documento en BD (documentId), no hacer doble alta.
        // Mantiene compatibilidad con respuestas antiguas (sin documentId).
        if (!uploadData?.documentId) {
          const addRes = await fetch('/api/biblioteca-legal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add-documento',
              nombre: uploadData.nombre,
              archivo: uploadData.archivo,
              tipo: uploadData.tipo,
              numeroPaginas: uploadData.numeroPaginas,
              fechaActualizacion: new Date().toISOString().split('T')[0]
            })
          })

          if (!addRes.ok) {
            let addData = null;
            try {
              addData = await addRes.json();
            } catch (e) {}
            throw new Error(addData?.error ? `Error al registrar ${file.name}: ${addData.error}` : `Error al registrar ${file.name}`)
          }
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      await cargarBiblioteca()
      alert('Documentos subidos correctamente')
    } catch (error: any) {
      console.error('Error:', error)
      alert(error?.message || 'Error al subir documentos')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      e.target.value = ''
    }
  }

  async function handleDeleteDocumento(docId: string) {
    if (!confirm('¿Eliminar este documento de la biblioteca? Se desasociará de todos los temas.')) return

    try {
      const res = await fetch('/api/biblioteca-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-documento',
          id: docId
        })
      })

      if (res.ok) {
        await cargarBiblioteca()
        alert('Documento eliminado')
      }
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert('Error al eliminar documento')
    }
  }

  function getTemasAsociados(docId: string): number {
    return Object.values(biblioteca.relaciones).filter(docs => docs.includes(docId)).length
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver a Administración
          </button>
          
          <h1 className="text-3xl font-bold mb-2">Biblioteca Legal</h1>
          <p className="text-gray-600">
            Gestiona documentos legales que se pueden asociar a múltiples temas
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm mb-2">Total Documentos</h3>
            <p className="text-3xl font-bold text-blue-600">{biblioteca.documentos.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm mb-2">Total Páginas</h3>
            <p className="text-3xl font-bold text-green-600">
              {biblioteca.documentos.reduce((sum, doc) => sum + doc.numeroPaginas, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm mb-2">Temas con Documentos</h3>
            <p className="text-3xl font-bold text-purple-600">
              {Object.keys(biblioteca.relaciones).length}
            </p>
          </div>
        </div>

        {/* Subir documentos */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Subir Documentos Legales</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.epub,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}% completado</p>
              </div>
            )}
          </div>
        </div>

        {/* Lista de documentos */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Páginas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temas Asociados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-red-600">
                    {loadError}
                  </td>
                </tr>
              ) : biblioteca.documentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay documentos en la biblioteca. Sube algunos para empezar.
                  </td>
                </tr>
              ) : (
                biblioteca.documentos.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-normal break-words">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">{doc.nombre}</div>
                      <div className="text-xs text-gray-500 break-words">{doc.archivo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {doc.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.numeroPaginas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.fechaActualizacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        {getTemasAsociados(doc.id)} temas
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = `/api/temario/download?archivo=${encodeURIComponent(doc.archivo)}`
                          a.download = doc.archivo
                          a.click()
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Descargar
                      </button>
                      <button
                        onClick={() => handleDeleteDocumento(doc.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
