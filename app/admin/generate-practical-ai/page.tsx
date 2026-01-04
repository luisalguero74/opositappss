'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopicDifficultySelector from '@/components/TopicDifficultySelector'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

interface Topic {
  id: string
  name: string
  file: string
  category: 'general' | 'especifico'
}

export default function GeneratePracticalAI() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedGeneralTopics, setSelectedGeneralTopics] = useState<string[]>([])
  const [selectedSpecificTopics, setSelectedSpecificTopics] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [useUploadMode, setUseUploadMode] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  const handleSelectionChange = (data: { 
    generalTopics: string[]; 
    specificTopics: string[]; 
    difficulty: 'facil' | 'media' | 'dificil' | 'todas' 
  }) => {
    setSelectedGeneralTopics(data.generalTopics)
    setSelectedSpecificTopics(data.specificTopics)
  }

  const handleGenerate = async () => {
    const selectedTopics = [...selectedGeneralTopics, ...selectedSpecificTopics]
    
    if (!useUploadMode && selectedTopics.length === 0) {
      setError('Debes seleccionar al menos un tema o subir archivos')
      return
    }

    if (useUploadMode && uploadedFiles.length === 0) {
      setError('Debes subir al menos un archivo')
      return
    }

    if (!title.trim()) {
      setError('Debes proporcionar un título para el supuesto práctico')
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')
    setProgress('Inicializando generación con IA...')

    try {
      let response

      if (useUploadMode) {
        // Modo: Archivos subidos
        const formData = new FormData()
        formData.append('title', title)
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })

        response = await fetch('/api/admin/generate-practical-ai', {
          method: 'POST',
          body: formData
        })
      } else {
        // Modo: Temas seleccionados del temario oficial
        response = await fetch('/api/admin/generate-practical-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            topicIds: selectedTopics // Enviar IDs de temas (e.g., ["g1", "e5"])
          })
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el supuesto práctico')
      }

      setSuccess(`✅ Supuesto práctico "${data.practicalCase.title}" generado exitosamente con ${data.questionCount} preguntas`)
      setTitle('')
      setSelectedGeneralTopics([])
      setSelectedSpecificTopics([])
      setUploadedFiles([])
      setProgress('')

      // Redirigir después de 3 segundos
      setTimeout(() => {
        router.push('/admin/practical-cases')
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Error inesperado al generar el supuesto práctico')
      setProgress('')
    } finally {
      setGenerating(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop()
      return ['pdf', 'txt', 'epub', 'doc', 'docx'].includes(ext || '')
    })

    if (validFiles.length !== files.length) {
      setError('Algunos archivos tienen formato no válido. Solo se permiten: PDF, TXT, EPUB, DOC, DOCX')
    }

    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin" 
            className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block"
          >
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖📋</div>
              <h1 className="text-4xl font-bold text-white">Generador de Supuestos Prácticos IA</h1>
              <p className="text-purple-100 mt-2">
                Crea supuestos prácticos profesionales basados en exámenes reales de administrativos de la Seguridad Social
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-red-700 font-medium">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <p className="text-green-700 font-medium">{success}</p>
            <p className="text-green-600 text-sm mt-1">Redirigiendo a gestión de supuestos prácticos...</p>
          </div>
        )}

        {progress && generating && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-700 font-medium">{progress}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Supuesto Práctico</h2>

          {/* Título */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Título del Supuesto Práctico
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Supuesto Práctico sobre Prestaciones de la SS"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={generating}
            />
            <p className="text-xs text-gray-500 mt-2">
              Este será el nombre que verán los usuarios en la plataforma
            </p>
          </div>

          {/* Selector de modo */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Fuente del Contenido</h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUseUploadMode(false)}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  !useUploadMode
                    ? 'border-purple-500 bg-purple-100 text-purple-700 font-bold'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300'
                }`}
                disabled={generating}
              >
                📚 Temas Predefinidos
              </button>
              <button
                type="button"
                onClick={() => setUseUploadMode(true)}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  useUploadMode
                    ? 'border-purple-500 bg-purple-100 text-purple-700 font-bold'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300'
                }`}
                disabled={generating}
              >
                📤 Subir Documentos
              </button>
            </div>
          </div>

          {/* Modo: Subir archivos */}
          {useUploadMode && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Subir Documentos Legales
              </label>
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center bg-purple-50 hover:bg-purple-100 transition">
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept=".pdf,.txt,.epub,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={generating}
                />
                <label
                  htmlFor="fileUpload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-lg font-semibold text-purple-700 mb-2">
                    Haz clic o arrastra archivos aquí
                  </p>
                  <p className="text-sm text-gray-600">
                    Formatos soportados: PDF, TXT, EPUB, DOC, DOCX
                  </p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Archivos cargados ({uploadedFiles.length}):
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {file.name.endsWith('.pdf') ? '📕' :
                           file.name.endsWith('.epub') ? '📘' :
                           file.name.endsWith('.doc') || file.name.endsWith('.docx') ? '📝' :
                           '📄'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                        disabled={generating}
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modo: Temas predefinidos */}
          {!useUploadMode && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 mb-4 block">
                📚 Selecciona los Temas del Temario Oficial
              </label>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Puedes seleccionar uno, varios o todos los temas de ambos temarios (General y Específico). 
                  El supuesto práctico se generará combinando el contenido de los temas seleccionados.
                </p>
              </div>

              <TopicDifficultySelector 
                onSelectionChange={handleSelectionChange}
                showDifficulty={false}
              />
              
              {(selectedGeneralTopics.length > 0 || selectedSpecificTopics.length > 0) && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-semibold text-purple-800 mb-2">
                    📊 Temas seleccionados: {selectedGeneralTopics.length + selectedSpecificTopics.length}
                  </p>
                  <div className="flex gap-4 text-sm text-purple-700">
                    {selectedGeneralTopics.length > 0 && (
                      <span>📘 General: {selectedGeneralTopics.length}</span>
                    )}
                    {selectedSpecificTopics.length > 0 && (
                      <span>📕 Específico: {selectedSpecificTopics.length}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Información sobre la Generación</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Se generarán <strong>15 preguntas tipo test</strong> profesionales</li>
              <li>• Cada pregunta tendrá <strong>4 opciones</strong> con solo una correcta</li>
              <li>• Incluye <strong>solucionario motivado</strong> con explicaciones jurídicas detalladas</li>
              <li>• Las preguntas se basan en <strong>exámenes oficiales</strong> de administrativos de la SS</li>
              <li>• Se verifican las respuestas contra <strong>leyes, RD y órdenes ministeriales vigentes</strong></li>
              <li>• El enunciado será <strong>profesional y técnico</strong> sobre los temas seleccionados</li>
              {useUploadMode && <li>• Soporta archivos: <strong>PDF, TXT, EPUB, DOC, DOCX</strong></li>}
            </ul>
          </div>

          {/* Botón de generar */}
          <button
            onClick={handleGenerate}
            disabled={generating || (!useUploadMode && (selectedGeneralTopics.length === 0 && selectedSpecificTopics.length === 0)) || (useUploadMode && uploadedFiles.length === 0) || !title.trim()}
            className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-all ${
              generating || (!useUploadMode && (selectedGeneralTopics.length === 0 && selectedSpecificTopics.length === 0)) || (useUploadMode && uploadedFiles.length === 0) || !title.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generando Supuesto Práctico con IA...
              </span>
            ) : (
              '🤖 Generar Supuesto Práctico con IA'
            )}
          </button>

          {!useUploadMode && selectedGeneralTopics.length === 0 && selectedSpecificTopics.length === 0 && (
            <p className="text-center text-sm text-red-500 mt-2">
              Selecciona al menos un tema para continuar
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Características del Supuesto Generado</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>Enunciado profesional:</strong> Redactado con lenguaje técnico-jurídico</p>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>15 preguntas:</strong> Formato oficial de examen</p>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>Motivación jurídica:</strong> Citas a normativa vigente</p>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>Verificación múltiple:</strong> Respuestas contrastadas</p>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>Estadísticas integradas:</strong> Seguimiento automático</p>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <p><strong>Compatible con sistema:</strong> Listo para usar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
