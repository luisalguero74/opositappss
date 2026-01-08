'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Document {
  id: string
  title: string
  type: string
  topic: string | null
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
  topic: string | null
  reviewed: boolean
  approved: boolean
  createdAt: string
  document: {
    id: string
    title: string
    type: string
    topic: string | null
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
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Filtros
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTopic, setFilterTopic] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-questions')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    try {
      const formData = new FormData(e.currentTarget)
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
    if (generatingDocId) {
      alert('Ya hay una generación en proceso. Cancélala primero o espera a que termine.')
      return
    }
    
    if (!confirm(`¿Generar ${count} preguntas de nivel ${selectedDifficulty === 'easy' ? 'INICIAL' : selectedDifficulty === 'medium' ? 'MEDIO' : 'AVANZADO'}?`)) return

    abortControllerRef.current = new AbortController()
    setGeneratingDocId(documentId)
    try {
      const res = await fetch('/api/admin/ai-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, count, difficulty: selectedDifficulty }),
        signal: abortControllerRef.current.signal
      })

      const data = await res.json()
      if (res.ok) {
        alert(`${data.questions.length} preguntas generadas. Revísalas en la pestaña "Preguntas IA"`)
        loadDocuments()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert('Generación cancelada')
      } else {
        alert('Error al generar preguntas')
      }
    } finally {
      setGeneratingDocId(null)
      abortControllerRef.current = null
    }
  }

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setGeneratingDocId(null)
      abortControllerRef.current = null
    }
  }

  const handleDeleteDocument = async (documentId: string, title: string) => {
    if (!confirm(`¿Eliminar el documento "${title}"? Esto también eliminará todas las preguntas generadas desde este documento.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Documento eliminado')
        loadDocuments()
      } else {
        alert('Error al eliminar documento')
      }
    } catch (error) {
      alert('Error al eliminar documento')
    }
  }

  const startEdit = (question: GeneratedQuestion) => {
    const options = JSON.parse(question.options)
    setEditingId(question.id)
    setEditForm({
      text: question.text,
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficulty: question.difficulty,
      type: question.document.type,
      topic: question.topic || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async (questionId: string) => {
    if (!editForm) return

    const options = [
      editForm.optionA,
      editForm.optionB,
      editForm.optionC,
      editForm.optionD
    ]

    try {
      const res = await fetch(`/api/admin/ai-questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editForm.text,
          options: JSON.stringify(options),
          correctAnswer: editForm.correctAnswer,
          explanation: editForm.explanation,
          difficulty: editForm.difficulty,
          topic: editForm.topic,
          type: editForm.type
        })
      })

      if (res.ok) {
        alert('Pregunta actualizada')
        cancelEdit()
        loadQuestions()
      } else {
        alert('Error al actualizar')
      }
    } catch (error) {
      alert('Error al guardar cambios')
    }
  }

  const handleApprove = async (questionId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai-questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, reviewed: true })
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

  // Filtros
  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'all' && q.document.type !== filterType) return false
    if (filterTopic !== 'all' && q.document.topic !== filterTopic) return false
    if (filterStatus === 'approved' && !q.approved) return false
    if (filterStatus === 'pending' && q.approved) return false
    if (filterStatus === 'rejected' && (!q.reviewed || q.approved)) return false
    return true
  })

  const availableTopics = Array.from(new Set(documents.map(d => d.topic).filter(Boolean)))

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 Generador de Preguntas IA</h1>
            <p className="text-gray-600 mt-2">Sube documentos legales, genera preguntas y edítalas antes de aprobarlas</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
          >
            ← Volver al Panel Admin
          </button>
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
            {/* Batch Processing */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-md p-6 mb-6 text-white">
              <h2 className="text-xl font-bold mb-3">🚀 Procesamiento Masivo</h2>
              <p className="mb-4 text-purple-100">
                Procesa automáticamente todos los documentos del temario con IA
              </p>
              <button
                onClick={async () => {
                  if (!confirm('¿Procesar todos los documentos encontrados en documentos-temario? Esto puede tardar varios minutos.')) return
                  
                  setLoading(true)
                  try {
                    const res = await fetch('/api/ai/batch-process', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'process-all' })
                    })
                    
                    const data = await res.json()
                    if (data.success) {
                      alert(`✅ Procesados: ${data.results.processed}\n❌ Fallos: ${data.results.failed}\n\n${data.results.errors.join('\n')}`)
                      loadDocuments()
                    }
                  } catch (error) {
                    alert('Error en procesamiento masivo')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition disabled:opacity-50"
              >
                {loading ? '⏳ Procesando...' : '⚡ Procesar Todos los Documentos'}
              </button>
            </div>

            {/* Embeddings Generation */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-md p-6 mb-6 text-white">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">🔍 Generar Embeddings (Búsqueda Semántica)</h2>
                  <p className="mb-2 text-blue-100">
                    Genera vectores de embeddings para búsqueda semántica inteligente con OpenAI
                  </p>
                  <p className="text-sm text-blue-200">
                    ✨ Mejora el asistente IA y la generación de preguntas con contexto más preciso
                  </p>
                  <p className="text-xs text-blue-200 mt-1">
                    💰 Costo estimado: ~$0.05-0.10 para todos los documentos
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('¿Generar embeddings para TODOS los documentos? Esto usará la API de OpenAI.\n\nCosto estimado: ~$0.05-0.10')) return
                      
                      setLoading(true)
                      try {
                        const res = await fetch('/api/admin/generate-embeddings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'all' })
                        })
                        
                        const data = await res.json()
                        if (data.success) {
                          alert(`✅ Embeddings generados correctamente!\n\n📊 Documentos procesados: ${data.processed}\n💰 Tokens usados: ${data.tokensUsed?.toLocaleString()}\n\nLa búsqueda semántica ya está activa.`)
                          loadDocuments()
                        } else {
                          alert(`❌ Error: ${data.error}`)
                        }
                      } catch (error) {
                        alert('Error generando embeddings')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? '⏳ Generando...' : '🚀 Generar Todos'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('¿Generar embeddings solo para documentos que NO los tienen?\n\nCosto: solo por documentos nuevos')) return
                      
                      setLoading(true)
                      try {
                        const res = await fetch('/api/admin/generate-embeddings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'missing' })
                        })
                        
                        const data = await res.json()
                        if (data.success) {
                          alert(`✅ Embeddings generados!\n\n📊 Documentos procesados: ${data.processed}\n⏭️ Documentos saltados: ${data.skipped}`)
                          loadDocuments()
                        } else {
                          alert(`❌ Error: ${data.error}`)
                        }
                      } catch (error) {
                        alert('Error generando embeddings')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="bg-white text-cyan-600 px-6 py-3 rounded-lg font-bold hover:bg-cyan-50 transition disabled:opacity-50 whitespace-nowrap text-sm"
                  >
                    {loading ? '⏳ Procesando...' : '➕ Solo Nuevos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Subir Documento</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <label className="block text-sm font-medium mb-2">Tema (opcional)</label>
                    <input
                      type="text"
                      name="topic"
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Tema 1"
                    />
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
                  <label className="block text-sm font-medium mb-2">Archivo (TXT, EPUB o PDF)</label>
                  <input
                    type="file"
                    name="file"
                    accept=".txt,.epub,.pdf"
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Archivos de texto (.txt) o libros electrónicos (.epub)</p>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Documentos Subidos</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      max="70"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Math.min(70, Math.max(1, Number(e.target.value))))}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">(1-70)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Dificultad:</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">📗 Inicial</option>
                      <option value="medium">📘 Medio</option>
                      <option value="hard">📕 Avanzado</option>
                    </select>
                  </div>
                </div>
              </div>
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
                            Tipo: {doc.type} {doc.topic && `| Tema: ${doc.topic}`} {doc.reference && `| ${doc.reference}`}
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
                            onClick={() => handleGenerate(doc.id, questionCount)}
                            disabled={generatingDocId !== null}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                          >
                            {generatingDocId === doc.id ? '⏳ Generando...' : `🤖 Generar ${questionCount} Preguntas`}
                          </button>
                          {generatingDocId === doc.id && (
                            <button
                              onClick={handleCancelGeneration}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                            >
                              ❌ Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            disabled={generatingDocId === doc.id}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                          >
                            🗑️ Eliminar
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
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <h3 className="font-bold mb-3">Filtros</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Temario</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="all">Todos</option>
                    <option value="temario_general">General</option>
                    <option value="temario_especifico">Específico</option>
                    <option value="ley">Ley</option>
                    <option value="real_decreto">Real Decreto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tema</label>
                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="all">Todos los temas</option>
                    {availableTopics.map(topic => topic && (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="all">Todas</option>
                    <option value="pending">Pendientes de revisar</option>
                    <option value="approved">Aprobadas</option>
                    <option value="rejected">Rechazadas</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Mostrando {filteredQuestions.length} de {questions.length} preguntas
              </p>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {loading ? (
                <p className="text-gray-500">Cargando preguntas...</p>
              ) : filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">No hay preguntas con estos filtros.</p>
                </div>
              ) : (
                filteredQuestions.map(q => {
                  const isEditing = editingId === q.id
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
                            {q.document.title} {q.document.topic && `- ${q.document.topic}`}
                          </span>
                          {q.approved && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Aprobada</span>}
                        </div>
                        <div className="flex gap-2">
                          {!isEditing && !q.approved && (
                            <>
                              <button
                                onClick={() => startEdit(q)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleApprove(q.id, true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                              >
                                ✓ Aprobar
                              </button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <button
                                onClick={() => saveEdit(q.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                              >
                                💾 Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                              >
                                ✖ Cancelar
                              </button>
                            </>
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

                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Pregunta</label>
                            <textarea
                              value={editForm.text}
                              onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                              className="w-full px-4 py-2 border rounded-lg"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Opción A</label>
                              <input
                                type="text"
                                value={editForm.optionA}
                                onChange={(e) => setEditForm({...editForm, optionA: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Opción B</label>
                              <input
                                type="text"
                                value={editForm.optionB}
                                onChange={(e) => setEditForm({...editForm, optionB: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Opción C</label>
                              <input
                                type="text"
                                value={editForm.optionC}
                                onChange={(e) => setEditForm({...editForm, optionC: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Opción D</label>
                              <input
                                type="text"
                                value={editForm.optionD}
                                onChange={(e) => setEditForm({...editForm, optionD: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Respuesta Correcta</label>
                              <select
                                value={editForm.correctAnswer}
                                onChange={(e) => setEditForm({...editForm, correctAnswer: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Dificultad</label>
                              <select
                                value={editForm.difficulty}
                                onChange={(e) => setEditForm({...editForm, difficulty: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              >
                                <option value="easy">Fácil</option>
                                <option value="medium">Media</option>
                                <option value="hard">Difícil</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Tipo</label>
                              <select
                                value={editForm.type}
                                onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                              >
                                <option value="general">General</option>
                                <option value="especifico">Específico</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Tema</label>
                              <input
                                type="text"
                                value={editForm.topic}
                                onChange={(e) => setEditForm({...editForm, topic: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Ej: Tema 1. La Constitución Española"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Explicación (opcional)</label>
                            <textarea
                              value={editForm.explanation}
                              onChange={(e) => setEditForm({...editForm, explanation: e.target.value})}
                              className="w-full px-4 py-2 border rounded-lg"
                              rows={2}
                              placeholder="Explicación de la respuesta correcta..."
                            />
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
