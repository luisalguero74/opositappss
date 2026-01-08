'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function UpdatePDFContentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  if (status === 'loading') {
    return <div className="p-8">Cargando...</div>
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'admin')) {
    router.push('/dashboard')
    return null
  }

  // Cargar lista de documentos
  useEffect(() => {
    fetch('/api/admin/debug-documents')
      .then(res => res.json())
      .then(data => {
        if (data.examples) {
          setDocuments(data.examples)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-completar el fileName con el nombre del archivo
      setFileName(file.name)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !fileName) {
      alert('Selecciona un archivo PDF y confirma el nombre')
      return
    }

    setUploading(true)
    setResult('')

    try {
      // Enviar PDF directamente al endpoint de actualización
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('fileName', fileName)

      const response = await fetch('/api/admin/update-document-content', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error actualizando documento')
      }

      const data = await response.json()
      setResult(`✅ Actualizado: ${data.documentId}\n📊 ${data.contentLength} caracteres\n🔍 Embedding: ${data.embeddingGenerated ? 'Sí' : 'No'}`)
      setSelectedFile(null)
      setFileName('')
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Actualizar Contenido de PDFs</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona PDF
            </label>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar documento de la BD
            </label>
            {loading ? (
              <p className="text-gray-500 text-sm">Cargando documentos...</p>
            ) : (
              <select
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">-- Selecciona un documento --</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.fileName}>
                    {doc.fileName} - {doc.title}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {documents.length} documentos en la base de datos
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !fileName}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? '⏳ Procesando...' : '📤 Subir y Actualizar'}
          </button>

          {result && (
            <div className={`p-4 rounded-md whitespace-pre-wrap ${
              result.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {result}
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Instrucciones</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Sube los PDFs de la carpeta <code className="bg-yellow-100 px-1">documentos-temario/biblioteca/</code></li>
            <li>El nombre del archivo DEBE coincidir exactamente con el que está en la BD</li>
            <li>El sistema extraerá el contenido automáticamente</li>
            <li>Se generará el embedding para búsqueda semántica</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
