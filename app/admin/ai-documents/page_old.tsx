'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Document {
  id: string
  title: string
  type: string
  reference: string | null
  fileName: string | null
  fileSize: number | null
  createdAt: string
  _count: {
    sections: number
    questions: number
  }
}

interface GeneratedQuestion {
  id: string
  text: string
  options: string
  correctAnswer: string
  explanation: string | null
  difficulty: string
  reviewed: boolean
  approved: boolean
  createdAt: string
  document: {
    id: string
    title: string
    type: string
  }
}

export default function AIDocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'documents' | 'questions'>('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    if (tab === 'documents') {
      loadDocuments()
    } else {
      loadQuestions()
    }
  }, [tab])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/documents')
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error cargando documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-questions')
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error cargando preguntas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        alert('Documento subido exitosamente')
        loadDocuments()
        e.currentTarget.reset()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error al subir documento')
    } finally {
      setUploading(false)
    }
  }

  const handleGenerate = async (documentId: string, count: number = 10) => {
    if (!confirm(`¿Generar ${count} preguntas desde este documento?`)) return

    setGenerating(true)
    try {
      const res = await fetch('/api/admin/ai-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, count, difficulty: 'medium' })
      })

      const data = await res.json()
      if (res.ok) {
        alert(`${data.questions.length} preguntas generadas. Revísalas en la pestaña "Preguntas IA"`)
        loadDocuments()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Error al generar preguntas')
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (questionId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai-questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      })

      if (res.ok) {
        loadQuestions()
      }
    } catch (error) {
      alert('Error al actualizar pregunta')
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return

    try {
      const res = await fetch(`/api/admin/ai-questions/${questionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadQuestions()
      }
    } catch (error) {
      alert('Error al eliminar pregunta')
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🤖 Generador de Preguntas IA</h1>
          <p className="text-gray-600 mt-2">Sube documentos legales y genera preguntas automáticamente con Ollama</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setTab('documents')}
            className={`px-6 py-3 font-medium transition ${
              tab === 'documents'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            📄 Documentos ({documents.length})
          </button>
          <button
            onClick={() => setTab('questions')}
            className={`px-6 py-3 font-medium transition ${
              tab === 'questions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            ❓ Preguntas IA ({questions.filter(q => !q.reviewed).length} pendientes)
          </button>
        </div>

        {/* Content */}
        {tab === 'documents' ? (
          <div>
            {/* Upload Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Subir Documento</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Ley 39/2015"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo</label>
                    <select name="type" required className="w-full px-4 py-2 border rounded-lg">
                      <option value="temario_general">Temario General</option>
                      <option value="temario_especifico">Temario Específico</option>
                      <option value="ley">Ley</option>
                      <option value="real_decreto">Real Decreto</option>
                      <option value="orden_ministerial">Orden Ministerial</option>
                      <option value="reglamento">Reglamento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Referencia (opcional)</label>
                    <input
                      type="text"
                      name="reference"
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="RD 8/2015"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Archivo (PDF o TXT)</label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.txt"
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : '📤 Subir Documento'}
                </button>
              </form>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Documentos Subidos</h2>
              {loading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : documents.length === 0 ? (
                <p className="text-gray-500">No hay documentos. Sube el primer documento arriba.</p>
              ) : (
                <div className="space-y-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{doc.title}</h3>
                          <p className="text-sm text-gray-600">
                            Tipo: {doc.type} | {doc.reference || 'Sin referencia'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {doc._count.sections} secciones | {doc._count.questions} preguntas generadas
                          </p>
                          {doc.fileName && (
                            <p className="text-xs text-gray-400">
                              Archivo: {doc.fileName} ({(doc.fileSize! / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerate(doc.id, 10)}
                            disabled={generating}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                          >
                            🤖 Generar 10 Preguntas
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-500">Cargando preguntas...</p>
            ) : questions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">No hay preguntas generadas aún.</p>
                <p className="text-sm text-gray-400 mt-2">Sube un documento y genera preguntas desde la pestaña "Documentos"</p>
              </div>
            ) : (
              questions.map(q => {
                const options = JSON.parse(q.options)
                return (
                  <div key={q.id} className={`bg-white rounded-lg shadow-md p-6 ${
                    q.approved ? 'border-2 border-green-500' : q.reviewed ? 'border-2 border-red-500' : ''
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          q.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {q.document.title}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {!q.approved && (
                          <button
                            onClick={() => handleApprove(q.id, true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                          >
                            ✓ Aprobar
                          </button>
                        )}
                        {q.approved && (
                          <button
                            onClick={() => handleApprove(q.id, false)}
                            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm"
                          >
                            ↩ Desaprobar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                        >
                          🗑 Eliminar
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg mb-3">{q.text}</h3>
                    
                    <div className="space-y-2 mb-4">
                      {options.map((opt: string, idx: number) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isCorrect = letter === q.correctAnswer
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg ${
                              isCorrect ? 'bg-green-50 border-2 border-green-500 font-medium' : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-bold mr-2">{letter})</span>
                            {opt}
                            {isCorrect && <span className="ml-2 text-green-600">✓ Correcta</span>}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-700"><strong>Explicación:</strong> {q.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
