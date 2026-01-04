'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PracticalCase {
  id: string
  title: string
  theme: string | null
  statement: string | null
  published: boolean
  category: string | null
  createdAt: string
  questions: any[]
  _count: {
    attempts: number
  }
}

export default function PracticalCasesAdmin() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [practicalCases, setPracticalCases] = useState<PracticalCase[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [message, setMessage] = useState<{ type: string; text: string; details?: any }>({ 
    type: '', 
    text: '',
    details: undefined
  })
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showTextInput, setShowTextInput] = useState(false)
  const [directText, setDirectText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'supuesto' | 'caso' | 'despublicar'>('supuesto')
  const [modalMode, setModalMode] = useState<'publish' | 'unpublish'>('publish')
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  
  // Estados para formulario manual
  const [manualData, setManualData] = useState({
    title: '',
    theme: '',
    statement: '',
    questions: [
      {
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        explanation: ''
      }
    ]
  })

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated') {
      loadPracticalCases()
    }
  }, [status, session, router])

  const loadPracticalCases = async () => {
    try {
      console.log('🔄 Cargando supuestos prácticos...')
      const res = await fetch('/api/admin/practical-cases')
      console.log('📡 Response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('📦 Data recibida:', data)
        console.log('📋 Cantidad de supuestos:', data.practicalCases?.length)
        setPracticalCases(data.practicalCases)
      } else {
        console.error('❌ Error en respuesta:', res.status)
      }
    } catch (error) {
      console.error('Error loading practical cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file || !title) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos requeridos' })
      return
    }

    setUploading(true)
    setMessage({ type: '', text: '', details: undefined })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      if (theme) formData.append('theme', theme)

      const res = await fetch('/api/admin/practical-cases', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setFile(null)
        setTitle('')
        setTheme('')
        loadPracticalCases()
        
        // Limpiar input file
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Error al subir supuesto práctico',
          details: data.details
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo primero' })
      return
    }

    setAnalyzing(true)
    setAnalysisResult(null)
    setMessage({ type: '', text: '', details: undefined })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/practical-cases/analyze', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setAnalysisResult(data.analysis)
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Error al analizar archivo',
          details: data.details
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setTitle('')
    setTheme('')
    setMessage({ type: '', text: '', details: undefined })
    setUploading(false)
    setAnalyzing(false)
    setAnalysisResult(null)
    setShowTextInput(false)
    setDirectText('')
    setShowManualForm(false)
    setManualData({
      title: '',
      theme: '',
      statement: '',
      questions: [
        {
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 'A',
          explanation: ''
        }
      ]
    })
    
    // Limpiar input file
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const addQuestion = () => {
    setManualData({
      ...manualData,
      questions: [
        ...manualData.questions,
        {
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 'A',
          explanation: ''
        }
      ]
    })
  }

  const removeQuestion = (index: number) => {
    if (manualData.questions.length > 1) {
      setManualData({
        ...manualData,
        questions: manualData.questions.filter((_, i) => i !== index)
      })
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...manualData.questions]
    if (field === 'option') {
      updated[index].options[value.index] = value.text
    } else {
      // @ts-ignore
      updated[index][field] = value
    }
    setManualData({ ...manualData, questions: updated })
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!manualData.title || !manualData.statement) {
      setMessage({ type: 'error', text: 'Título y enunciado son obligatorios' })
      return
    }

    if (manualData.questions.length === 0 || manualData.questions.length > 15) {
      setMessage({ type: 'error', text: 'Debe haber entre 1 y 15 preguntas' })
      return
    }

    // Validar que todas las preguntas tengan datos
    for (let i = 0; i < manualData.questions.length; i++) {
      const q = manualData.questions[i]
      if (!q.text.trim()) {
        setMessage({ type: 'error', text: `La pregunta ${i + 1} está vacía` })
        return
      }
      if (q.options.some(opt => !opt.trim())) {
        setMessage({ type: 'error', text: `La pregunta ${i + 1} tiene opciones vacías` })
        return
      }
    }

    setUploading(true)
    setMessage({ type: '', text: '', details: undefined })

    try {
      const res = await fetch('/api/admin/practical-cases/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: `✅ Supuesto práctico creado con ${manualData.questions.length} preguntas` })
        handleReset()
        loadPracticalCases()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al crear supuesto práctico' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyzeText = () => {
    if (!directText.trim()) {
      alert('Por favor pega el contenido del archivo')
      return
    }

    // Análisis del texto directo
    const lines = directText.split('\n')
    const debugInfo: any = {
      totalLines: lines.length,
      firstLines: lines.slice(0, 20).map((l, i) => `${i + 1}: ${l.trim()}`),
      sectionsFound: []
    }

    let enunciadoFound = false
    let preguntasFound = false
    let solucionarioFound = false
    let questionsCount = 0

    lines.forEach((line, index) => {
      const upper = line.toUpperCase().trim()
      if (upper.includes('ENUNCIADO')) {
        enunciadoFound = true
        debugInfo.sectionsFound.push(`ENUNCIADO en línea ${index + 1}`)
      }
      if (upper.includes('PREGUNTAS') && !upper.includes('PREGUNTA ')) {
        preguntasFound = true
        debugInfo.sectionsFound.push(`PREGUNTAS en línea ${index + 1}`)
      }
      if (upper.includes('SOLUCIONARIO') || upper.includes('SOLUCIONES')) {
        solucionarioFound = true
        debugInfo.sectionsFound.push(`SOLUCIONARIO en línea ${index + 1}`)
      }
      if (/^PREGUNTA\s+\d+/i.test(line.trim())) {
        questionsCount++
      }
    })

    setAnalysisResult({
      source: 'text',
      totalLines: lines.length,
      sections: {
        enunciadoFound,
        preguntasFound,
        solucionarioFound,
        questionsDetected: questionsCount
      },
      rawPreview: directText.substring(0, 1000),
      debugInfo,
      suggestions: [
        !enunciadoFound && '⚠️ No se detectó "ENUNCIADO"',
        !preguntasFound && '⚠️ No se detectó "PREGUNTAS"',
        !solucionarioFound && '⚠️ No se detectó "SOLUCIONARIO"',
        questionsCount === 0 && '⚠️ No se detectaron preguntas',
        questionsCount > 15 && `⚠️ Se detectaron ${questionsCount} preguntas (máximo: 15)`
      ].filter(Boolean)
    })
  }

  const handlePublish = async (id: string, currentStatus: boolean, category?: string | null) => {
    if (currentStatus) {
      // Despublicar - Mostrar modal con opciones
      console.log('🔄 Mostrando opciones de despublicación:', id, category)
      setSelectedCaseId(id)
      setCurrentCategory(category || null)
      setSelectedCategory(category === 'caso' ? 'supuesto' : 'caso') // Opción contraria por defecto
      setModalMode('unpublish')
      setShowCategoryModal(true)
    } else {
      // Publicar - Mostrar modal para elegir categoría
      setSelectedCaseId(id)
      setModalMode('publish')
      setShowCategoryModal(true)
    }
  }

  const confirmPublish = async () => {
    if (!selectedCaseId) return

    if (modalMode === 'publish') {
      // Publicar con categoría seleccionada
      try {
        const res = await fetch(`/api/admin/practical-cases/${selectedCaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'publish',
            category: selectedCategory
          })
        })

        if (res.ok) {
          loadPracticalCases()
          setMessage({ 
            type: 'success', 
            text: `Supuesto publicado como ${selectedCategory === 'supuesto' ? 'Supuesto Práctico' : 'Caso Práctico'}` 
          })
          setShowCategoryModal(false)
          setSelectedCaseId(null)
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al publicar' })
      }
    } else {
      // Despublicar o mover categoría
      if (selectedCategory === 'despublicar') {
        // Despublicar completamente
        try {
          const res = await fetch(`/api/admin/practical-cases/${selectedCaseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unpublish' })
          })

          if (res.ok) {
            loadPracticalCases()
            setMessage({ type: 'success', text: 'Supuesto despublicado completamente' })
            setShowCategoryModal(false)
            setSelectedCaseId(null)
          }
        } catch (error) {
          setMessage({ type: 'error', text: 'Error al despublicar' })
        }
      } else {
        // Mover a otra categoría (sigue publicado)
        try {
          const res = await fetch(`/api/admin/practical-cases/${selectedCaseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'change-category',
              category: selectedCategory
            })
          })

          if (res.ok) {
            loadPracticalCases()
            setMessage({ 
              type: 'success', 
              text: `Movido a ${selectedCategory === 'supuesto' ? 'Supuestos Prácticos' : 'Casos Prácticos'}` 
            })
            setShowCategoryModal(false)
            setSelectedCaseId(null)
          }
        } catch (error) {
          setMessage({ type: 'error', text: 'Error al cambiar categoría' })
        }
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este supuesto práctico? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/practical-cases/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadPracticalCases()
        setMessage({ type: 'success', text: 'Supuesto práctico eliminado' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar supuesto práctico' })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const filteredCases = practicalCases.filter(pc => {
    if (filter === 'published') return pc.published
    if (filter === 'draft') return !pc.published
    return true
  })

  console.log('🎯 Render - Total supuestos:', practicalCases.length)
  console.log('🎯 Render - Filtrados:', filteredCases.length)
  console.log('🎯 Render - Filtro activo:', filter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h1 className="text-4xl font-bold text-white">Gestión de Supuestos Prácticos</h1>
              <p className="text-orange-100 mt-2">Sube, edita y publica supuestos prácticos para los opositores</p>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`px-6 py-4 ${
              message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              <p className="font-semibold">{message.text}</p>
              
              {message.details && (
                <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">📋 Información de Debug:</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Total líneas: <strong>{message.details.totalLines}</strong></p>
                    </div>
                    {message.details.statementLines !== undefined && (
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-blue-700">Líneas de enunciado: <strong>{message.details.statementLines}</strong></p>
                      </div>
                    )}
                    {message.details.questionsLines !== undefined && (
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-purple-700">Líneas de preguntas: <strong>{message.details.questionsLines}</strong></p>
                      </div>
                    )}
                    {message.details.solutionsLines !== undefined && (
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-green-700">Líneas de solucionario: <strong>{message.details.solutionsLines}</strong></p>
                      </div>
                    )}
                  </div>
                  
                  {message.details.sectionsFound && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 font-semibold">Secciones encontradas:</p>
                      <ul className="text-xs text-gray-600 ml-4">
                        {message.details.sectionsFound.map((section: string, i: number) => (
                          <li key={i}>• {section}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {message.details.statementPreview && (
                    <div className="mb-3 bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800 font-semibold mb-1">Vista previa del enunciado capturado:</p>
                      <p className="text-xs text-blue-700 italic">"{message.details.statementPreview}"</p>
                      <p className="text-xs text-blue-600 mt-1">Longitud total: {message.details.statementLength} caracteres</p>
                    </div>
                  )}
                  
                  {message.details.questionsFound !== undefined && (
                    <p className="text-sm text-gray-700 mb-2">
                      ✓ Preguntas encontradas: <strong>{message.details.questionsFound}</strong> de 15
                    </p>
                  )}
                  
                  {message.details.solutionsCount !== undefined && (
                    <p className="text-sm text-gray-700 mb-2">
                      ✓ Soluciones encontradas: <strong>{message.details.solutionsCount}</strong> de 15
                    </p>
                  )}
                  
                  {message.details.invalidQuestions && (
                    <div className="mb-3">
                      <p className="text-sm text-red-700 font-semibold">⚠️ Preguntas con opciones incompletas:</p>
                      <ul className="text-xs text-red-600 ml-4">
                        {message.details.invalidQuestions.map((q: any, i: number) => (
                          <li key={i}>
                            • Pregunta {q.number}: {q.optionsFound} opciones (se requieren 4)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {message.details.hint && (
                    <p className="text-sm text-blue-700 mt-2">💡 {message.details.hint}</p>
                  )}
                  
                  {message.details.firstLines && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 font-semibold">Primeras líneas del archivo:</p>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {message.details.firstLines.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message.type === 'error' && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition"
                >
                  🔄 Reiniciar y Probar de Nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Formulario de subida */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📤 Subir Nuevo Supuesto Práctico</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTextInput(false)
                  setShowManualForm(!showManualForm)
                  if (!showManualForm) {
                    setAnalysisResult(null)
                    setFile(null)
                  }
                }}
                className={`px-4 py-2 ${showManualForm ? 'bg-green-600' : 'bg-green-500'} text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold`}
              >
                {showManualForm ? '✓ Modo Manual' : '✍️ Modo Manual'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualForm(false)
                  setShowTextInput(!showTextInput)
                  if (!showTextInput) {
                    setAnalysisResult(null)
                    setFile(null)
                  }
                }}
                className={`px-4 py-2 ${showTextInput ? 'bg-purple-600' : 'bg-purple-500'} text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold`}
              >
                {showTextInput ? '✓ Modo Texto' : '📝 Modo Texto'}
              </button>
            </div>
          </div>
          
          {showManualForm ? (
            // Modo manual
            <form onSubmit={handleManualSubmit}>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-semibold mb-2">✍️ Modo Introducción Manual:</p>
                <p className="text-xs text-green-700">Introduce cada parte del supuesto práctico copiando y pegando. Puedes añadir hasta 15 preguntas.</p>
              </div>

              {/* Título y Tema */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Título del Supuesto *</label>
                  <input
                    type="text"
                    value={manualData.title}
                    onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="Ej: Supuesto Práctico 1 - Prestaciones"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Tema (opcional)</label>
                  <input
                    type="text"
                    value={manualData.theme}
                    onChange={(e) => setManualData({ ...manualData, theme: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="Ej: Tema 5 del Específico"
                  />
                </div>
              </div>

              {/* Enunciado */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Enunciado del Caso *</label>
                <textarea
                  value={manualData.statement}
                  onChange={(e) => setManualData({ ...manualData, statement: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  rows={8}
                  placeholder="Pega aquí el enunciado completo del caso práctico..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{manualData.statement.length} caracteres</p>
              </div>

              {/* Preguntas */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Preguntas ({manualData.questions.length}/15)</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={manualData.questions.length >= 15}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                  >
                    ➕ Añadir Pregunta
                  </button>
                </div>

                <div className="space-y-6">
                  {manualData.questions.map((question, qIndex) => (
                    <div key={qIndex} className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-700">Pregunta {qIndex + 1}</h4>
                        {manualData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-red-600 hover:text-red-700 font-semibold text-sm"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>

                      {/* Texto de la pregunta */}
                      <div className="mb-4">
                        <label className="block text-gray-700 font-semibold mb-2">Texto de la Pregunta *</label>
                        <textarea
                          value={question.text}
                          onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                          rows={3}
                          placeholder="Pega aquí el texto de la pregunta..."
                          required
                        />
                      </div>

                      {/* Opciones */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {['A', 'B', 'C', 'D'].map((letter, optIndex) => (
                          <div key={letter}>
                            <label className="block text-gray-700 font-semibold mb-2">Opción {letter} *</label>
                            <textarea
                              value={question.options[optIndex]}
                              onChange={(e) => updateQuestion(qIndex, 'option', { index: optIndex, text: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                              rows={2}
                              placeholder={`Texto de la opción ${letter}...`}
                              required
                            />
                          </div>
                        ))}
                      </div>

                      {/* Respuesta correcta */}
                      <div className="mb-4">
                        <label className="block text-gray-700 font-semibold mb-2">Respuesta Correcta *</label>
                        <div className="flex gap-4">
                          {['A', 'B', 'C', 'D'].map((letter) => (
                            <label key={letter} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                value={letter}
                                checked={question.correctAnswer === letter}
                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                className="mr-2"
                              />
                              <span className={`px-4 py-2 rounded-lg font-semibold ${
                                question.correctAnswer === letter
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {letter}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Explicación */}
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Explicación/Motivación (opcional)</label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                          rows={3}
                          placeholder="Pega aquí la motivación técnica o legal de la respuesta correcta..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-4 rounded-lg hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50"
                >
                  {uploading ? '⏳ Creando...' : '✅ Crear Supuesto Práctico'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 bg-gray-200 text-gray-700 font-bold py-4 rounded-lg hover:bg-gray-300 transition"
                >
                  🔄 Limpiar
                </button>
              </div>
            </form>
          ) : showTextInput ? (
            // Modo texto directo
            <div>
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 font-semibold mb-2">💡 Modo Texto Directo:</p>
                <p className="text-xs text-purple-700">Pega aquí el contenido completo de tu archivo para analizarlo sin necesidad de subirlo.</p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Contenido del Supuesto Práctico</label>
                <textarea
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                  rows={20}
                  placeholder="Pega aquí todo el contenido de tu archivo..."
                />
                <p className="text-xs text-gray-500 mt-2">Líneas: {directText.split('\n').length} | Caracteres: {directText.length}</p>
              </div>

              <button
                type="button"
                onClick={handleAnalyzeText}
                disabled={!directText.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50"
              >
                🔍 Analizar Texto Pegado
              </button>
            </div>
          ) : (
            // Modo archivo original
            <form onSubmit={handleUpload}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Título del Supuesto *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="Ej: Supuesto Práctico 1 - Prestaciones"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Tema (opcional)</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="Ej: Tema 5 del Específico"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Archivo (PDF o TXT) *</label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading || analyzing}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-lg hover:from-orange-700 hover:to-red-700 transition disabled:opacity-50"
              >
                {uploading ? '⏳ Subiendo...' : '📤 Subir Supuesto Práctico'}
              </button>
              
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || analyzing || uploading}
                className="px-8 bg-purple-600 text-white font-bold py-4 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {analyzing ? '⏳ Analizando...' : '🔍 Analizar Archivo'}
              </button>
            </div>
          </form>
          )}
          
          {/* Panel de análisis de archivo */}
          {analysisResult && !analysisResult.source && analysisResult.fileName && (
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
              <h3 className="text-xl font-bold text-purple-900 mb-4">🔍 Análisis del Archivo</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Archivo</p>
                  <p className="text-lg font-bold text-gray-800">{analysisResult.fileName}</p>
                  <p className="text-xs text-gray-500">{(analysisResult.fileSize / 1024).toFixed(1)} KB</p>
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.enunciadoFound ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-sm text-gray-600">Enunciado</p>
                  <p className="text-2xl font-bold">
                    {analysisResult.sections.enunciadoFound ? '✓' : '✗'}
                  </p>
                  {analysisResult.sections.enunciadoLine > 0 && (
                    <p className="text-xs text-gray-600">Línea {analysisResult.sections.enunciadoLine}</p>
                  )}
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.questionsDetected > 0 && analysisResult.sections.questionsDetected <= 15 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <p className="text-sm text-gray-600">Preguntas</p>
                  <p className="text-2xl font-bold">{analysisResult.sections.questionsDetected}/15</p>
                  {analysisResult.sections.preguntasLine > 0 && (
                    <p className="text-xs text-gray-600">Línea {analysisResult.sections.preguntasLine}</p>
                  )}
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.solucionarioFound ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-sm text-gray-600">Solucionario</p>
                  <p className="text-2xl font-bold">
                    {analysisResult.sections.solucionarioFound ? '✓' : '✗'}
                  </p>
                  {analysisResult.sections.solucionarioLine > 0 && (
                    <p className="text-xs text-gray-600">Línea {analysisResult.sections.solucionarioLine}</p>
                  )}
                </div>
              </div>

              {analysisResult.suggestions.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="font-bold text-yellow-900 mb-2">⚠️ Advertencias:</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {analysisResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <p className="font-bold text-gray-800 mb-2">📄 Vista previa del contenido (primeros 500 caracteres):</p>
                <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {analysisResult.rawPreview}
                </pre>
              </div>

              <details className="bg-white p-4 rounded-lg shadow">
                <summary className="font-bold text-gray-800 cursor-pointer hover:text-purple-700">
                  📋 Ver análisis línea por línea (primeras 50 líneas)
                </summary>
                <div className="mt-4 max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Contenido</th>
                        <th className="p-2 text-left">Detecciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.lines.map((line: any, i: number) => (
                        <tr key={i} className={`border-b ${line.isEmpty ? 'bg-gray-50' : ''}`}>
                          <td className="p-2 text-gray-500">{line.number}</td>
                          <td className="p-2 font-mono">
                            {line.isEmpty ? (
                              <span className="text-gray-400 italic">(vacía)</span>
                            ) : (
                              <span className={`${
                                line.detections.isEnunciado || line.detections.isPreguntas || line.detections.isSolucionario
                                  ? 'font-bold text-purple-700'
                                  : line.detections.isPregunta
                                  ? 'text-blue-700'
                                  : line.detections.isOpcion
                                  ? 'text-green-700'
                                  : 'text-gray-700'
                              }`}>
                                {line.trimmed.length > 80 ? line.trimmed.substring(0, 80) + '...' : line.trimmed}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            {line.detections.isEnunciado && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs mr-1">ENUNCIADO</span>}
                            {line.detections.isPreguntas && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1">PREGUNTAS</span>}
                            {line.detections.isPregunta && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1">Pregunta</span>}
                            {line.detections.isOpcion && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs mr-1">Opción</span>}
                            {line.detections.isSolucionario && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs mr-1">SOLUCIONARIO</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Cerrar Análisis
                </button>
              </div>
            </div>
          )}
          
          {/* Panel de análisis de texto directo */}
          {analysisResult && analysisResult.source === 'text' && (
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
              <h3 className="text-xl font-bold text-purple-900 mb-4">🔍 Análisis del Texto</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Total Líneas</p>
                  <p className="text-2xl font-bold text-gray-800">{analysisResult.totalLines}</p>
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.enunciadoFound ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-sm text-gray-600">Enunciado</p>
                  <p className="text-2xl font-bold">{analysisResult.sections.enunciadoFound ? '✓' : '✗'}</p>
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.questionsDetected > 0 && analysisResult.sections.questionsDetected <= 15 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <p className="text-sm text-gray-600">Preguntas</p>
                  <p className="text-2xl font-bold">{analysisResult.sections.questionsDetected}/15</p>
                </div>
                <div className={`p-4 rounded-lg shadow ${analysisResult.sections.solucionarioFound ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-sm text-gray-600">Solucionario</p>
                  <p className="text-2xl font-bold">{analysisResult.sections.solucionarioFound ? '✓' : '✗'}</p>
                </div>
              </div>

              {analysisResult.suggestions.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="font-bold text-yellow-900 mb-2">⚠️ Problemas Detectados:</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {analysisResult.suggestions.map((s: string, i: number) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <p className="font-bold text-gray-800 mb-2">📋 Secciones Encontradas:</p>
                {analysisResult.debugInfo.sectionsFound.length > 0 ? (
                  <ul className="text-sm text-gray-700">
                    {analysisResult.debugInfo.sectionsFound.map((s: string, i: number) => (
                      <li key={i} className="py-1">• {s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-600">❌ No se detectaron secciones</p>
                )}
              </div>

              <details className="bg-white p-4 rounded-lg shadow">
                <summary className="font-bold text-gray-800 cursor-pointer hover:text-purple-700">
                  📄 Ver primeras 20 líneas con análisis
                </summary>
                <pre className="mt-4 text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto">
                  {analysisResult.debugInfo.firstLines.join('\n')}
                </pre>
              </details>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-2">💡 Siguiente paso:</p>
                <p className="text-sm text-blue-700">
                  Si ves que faltan secciones, copia el formato exacto de las primeras líneas y pégalo aquí en un mensaje. 
                  Así puedo adaptar el parser a tu formato específico.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-3 text-lg">📋 Formato del archivo</h3>
            
            <div className="mb-4 flex gap-3">
              <a 
                href="/ejemplos/EJEMPLO_SUPUESTO_PRACTICO_CORRECTO.txt" 
                download 
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition text-center font-semibold text-sm"
              >
                📥 Descargar Ejemplo Completo (5 preguntas)
              </a>
              <a 
                href="/ejemplos/EJEMPLO_BASICO_2_PREGUNTAS.txt" 
                download 
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition text-center font-semibold text-sm"
              >
                📥 Descargar Ejemplo Básico (2 preguntas)
              </a>
            </div>

            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-sm text-yellow-800 font-semibold">⚠️ ¿Tienes problemas al subir?</p>
              <a 
                href="/ejemplos/ERRORES_COMUNES_SUPUESTOS.md" 
                target="_blank"
                className="text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                Ver guía de errores comunes y soluciones →
              </a>
            </div>
            
            <div className="text-sm text-blue-700 space-y-2">
              <p><strong>1. ENUNCIADO:</strong> Texto con el caso práctico</p>
              <p><strong>2. PREGUNTAS:</strong> De 1 a 15 preguntas precedidas de "PREGUNTA 1:", "PREGUNTA 2:", etc.</p>
              <p><strong>3. OPCIONES:</strong> 4 opciones por pregunta: "OPCIÓN A:", "OPCIÓN B:", "OPCIÓN C:", "OPCIÓN D:"</p>
              <p><strong>4. SOLUCIONARIO:</strong> Lista de respuestas correctas con motivación:</p>
              <div className="ml-4 mt-2 p-3 bg-white rounded border border-blue-300">
                <code className="text-xs block">
                  PREGUNTA 1: A<br/>
                  [Texto explicando por qué A es correcta]<br/>
                  <br/>
                  PREGUNTA 2: C<br/>
                  [Motivación técnica de la respuesta C]<br/>
                  <br/>
                  PREGUNTA 3: B<br/>
                  [Justificación legal o técnica]
                </code>
              </div>
              <p className="mt-2 text-xs italic">💡 La motivación/explicación es el texto que aparece después de cada "PREGUNTA X: [LETRA]" y antes de la siguiente pregunta.</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'all' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({practicalCases.length})
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'published' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Publicados ({practicalCases.filter(p => p.published).length})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'draft' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Borradores ({practicalCases.filter(p => !p.published).length})
            </button>
          </div>
        </div>

        {/* Lista de supuestos prácticos */}
        <div className="space-y-4">
          {filteredCases.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 text-lg">No hay supuestos prácticos aún</p>
            </div>
          ) : (
            filteredCases.map(practicalCase => (
              <div key={practicalCase.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{practicalCase.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        practicalCase.published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {practicalCase.published ? '✓ Publicado' : '○ Borrador'}
                      </span>
                      {practicalCase.published && practicalCase.category && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          practicalCase.category === 'supuesto' 
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {practicalCase.category === 'supuesto' ? '📝 Supuesto' : '💼 Caso'}
                        </span>
                      )}
                      {practicalCase.theme && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {practicalCase.theme}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mb-3">
                      <span>📝 {practicalCase.questions.length} preguntas</span>
                      <span>👥 {practicalCase._count.attempts} intentos</span>
                      <span>📅 {new Date(practicalCase.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                    {practicalCase.statement && (
                      <p className="text-gray-700 text-sm line-clamp-2">{practicalCase.statement}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/admin/practical-cases/${practicalCase.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                    >
                      ✏️ Editar
                    </Link>
                    <Link
                      href={`/admin/practical-cases/${practicalCase.id}/stats`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                    >
                      📊 Stats
                    </Link>
                    <a
                      href={`/api/admin/practical-cases/${practicalCase.id}/generate-html`}
                      download
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
                      title="Generar formulario interactivo HTML"
                    >
                      📄 HTML
                    </a>
                    <button
                      onClick={() => handlePublish(practicalCase.id, practicalCase.published, practicalCase.category)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        practicalCase.published
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {practicalCase.published ? '◉ Despublicar' : '✓ Validar'}
                    </button>
                    <button
                      onClick={() => handleDelete(practicalCase.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de selección de categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {modalMode === 'publish' ? '📋 Selecciona dónde publicar' : '🔄 Gestionar Publicación'}
            </h3>
            <p className="text-gray-600 mb-6">
              {modalMode === 'publish' 
                ? 'Elige si este contenido aparecerá en Supuestos Prácticos o en Casos Prácticos:'
                : `Este supuesto está publicado como ${currentCategory === 'supuesto' ? 'Supuesto Práctico' : 'Caso Práctico'}. ¿Qué deseas hacer?`
              }
            </p>
            
            <div className="space-y-3 mb-6">
              {modalMode === 'publish' ? (
                <>
                  <button
                    onClick={() => setSelectedCategory('supuesto')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedCategory === 'supuesto'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCategory === 'supuesto' ? 'border-orange-500' : 'border-gray-300'
                      }`}>
                        {selectedCategory === 'supuesto' && (
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">📝 Supuesto Práctico</div>
                        <div className="text-sm text-gray-600">Aparecerá en la sección de Supuestos Prácticos</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedCategory('caso')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedCategory === 'caso'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCategory === 'caso' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedCategory === 'caso' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">💼 Caso Práctico</div>
                        <div className="text-sm text-gray-600">Aparecerá en la sección de Casos Prácticos</div>
                      </div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedCategory('despublicar')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedCategory === 'despublicar'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCategory === 'despublicar' ? 'border-red-500' : 'border-gray-300'
                      }`}>
                        {selectedCategory === 'despublicar' && (
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">🗑️ Despublicar Completamente</div>
                        <div className="text-sm text-gray-600">Mover a borradores (ya no será visible)</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedCategory(currentCategory === 'supuesto' ? 'caso' : 'supuesto')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedCategory === (currentCategory === 'supuesto' ? 'caso' : 'supuesto')
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCategory === (currentCategory === 'supuesto' ? 'caso' : 'supuesto') 
                          ? 'border-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedCategory === (currentCategory === 'supuesto' ? 'caso' : 'supuesto') && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">
                          🔄 Mover a {currentCategory === 'supuesto' ? 'Casos Prácticos' : 'Supuestos Prácticos'}
                        </div>
                        <div className="text-sm text-gray-600">Cambiar categoría (sigue publicado)</div>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setSelectedCaseId(null)
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPublish}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold"
              >
                {modalMode === 'publish' ? '✓ Publicar' : '✓ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
