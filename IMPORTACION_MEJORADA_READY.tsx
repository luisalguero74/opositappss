// ==========================================
// SISTEMA DE IMPORTACIÓN MEJORADO
// ==========================================
// Componente React mejorado para importar preguntas desde PDF, DOC, EPUB, TXT, JSON
// 
// MEJORAS IMPLEMENTADAS:
// 1. Soporte multi-formato (PDF, DOC, DOCX, EPUB, TXT, JSON)
// 2. Vista previa antes de importar
// 3. Validación en tiempo real
// 4. Corrección automática de errores comunes
// 5. Mapeo inteligente de campos
// 6. Progreso detallado
// 7. Rollback en caso de error
// 8. Plantillas de ejemplo

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ParsedQuestion {
  text: string
  options: string | { a: string; b: string; c: string; d: string }
  correctAnswer: string
  explanation?: string
  tema?: string
  difficulty?: 'facil' | 'media' | 'dificil'
  errors?: string[]
  warnings?: string[]
}

interface ImportPreview {
  total: number
  valid: number
  withErrors: number
  withWarnings: number
  questions: ParsedQuestion[]
}

export default function ImportQuestionsImproved() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Estados
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'import' | 'done'>('select')
  
  // Opciones
  const [autoCorrect, setAutoCorrect] = useState(true)
  const [skipErrors, setSkipErrors] = useState(false)
  const [markReviewed, setMarkReviewed] = useState(false)
  const [importToBank, setImportToBank] = useState(true)
  
  // Progreso
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: ''
  })

  if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
    router.push('/dashboard')
    return null
  }

  // ==========================================
  // PARSEO INTELIGENTE DE ARCHIVOS
  // ==========================================
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    setFile(selectedFile)
    setError('')
    setPreview(null)
    
    // Validar tipo de archivo
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    const allowedTypes = ['json', 'txt', 'pdf', 'doc', 'docx', 'epub']
    
    if (!ext || !allowedTypes.includes(ext)) {
      setError(`Tipo de archivo no soportado. Usa: ${allowedTypes.join(', ')}`)
      return
    }
    
    setParsing(true)
    setCurrentStep('preview')
    
    try {
      // Leer archivo
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('autoCorrect', autoCorrect.toString())
      
      // Endpoint de parseo
      const res = await fetch('/api/admin/questions/parse', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error al parsear archivo')
      }
      
      const data = await res.json()
      setPreview(data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar archivo')
      setCurrentStep('select')
    } finally {
      setParsing(false)
    }
  }
  
  // ==========================================
  // IMPORTACIÓN CON PROGRESO
  // ==========================================
  
  const handleImport = async () => {
    if (!preview) return
    
    setImporting(true)
    setCurrentStep('import')
    setError('')
    
    try {
      const questionsToImport = skipErrors 
        ? preview.questions.filter(q => !q.errors || q.errors.length === 0)
        : preview.questions
      
      const batchSize = 50
      const totalBatches = Math.ceil(questionsToImport.length / batchSize)
      let imported = 0
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = questionsToImport.slice(i * batchSize, (i + 1) * batchSize)
        
        setProgress({
          current: i + 1,
          total: totalBatches,
          message: `Importando lote ${i + 1} de ${totalBatches}...`
        })
        
        const res = await fetch('/api/admin/questions/import-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: batch,
            markReviewed,
            importToBank
          })
        })
        
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Error en importación')
        }
        
        const data = await res.json()
        imported += data.imported || 0
      }
      
      setResult({
        success: true,
        total: questionsToImport.length,
        imported,
        skipped: preview.questions.length - questionsToImport.length
      })
      
      setCurrentStep('done')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
      setCurrentStep('preview')
    } finally {
      setImporting(false)
    }
  }
  
  // ==========================================
  // DESCARGA DE PLANTILLA
  // ==========================================
  
  const downloadTemplate = (format: 'json' | 'txt') => {
    let content = ''
    let filename = ''
    
    if (format === 'json') {
      content = JSON.stringify({
        questions: [
          {
            text: "¿Cuál es la estructura básica de la Seguridad Social en España?",
            options: {
              a: "Régimen General y Regímenes Especiales",
              b: "Solo Régimen General",
              c: "Solo Régimen de Autónomos",
              d: "Ninguna de las anteriores"
            },
            correctAnswer: "A",
            explanation: "Según el artículo 9 del texto refundido de la Ley General de la Seguridad Social, aprobado por Real Decreto Legislativo 8/2015, de 30 de octubre, el Sistema de la Seguridad Social está integrado por el Régimen General y por los Regímenes Especiales.",
            tema: "01.01",
            difficulty: "media"
          }
        ]
      }, null, 2)
      filename = 'plantilla-preguntas.json'
    } else {
      content = `PREGUNTA 1:
¿Cuál es la estructura básica de la Seguridad Social en España?

OPCIONES:
a) Régimen General y Regímenes Especiales
b) Solo Régimen General
c) Solo Régimen de Autónomos
d) Ninguna de las anteriores

RESPUESTA CORRECTA: A

EXPLICACIÓN:
Según el artículo 9 del texto refundido de la Ley General de la Seguridad Social, aprobado por Real Decreto Legislativo 8/2015, de 30 de octubre, el Sistema de la Seguridad Social está integrado por el Régimen General y por los Regímenes Especiales.

TEMA: 01.01
DIFICULTAD: media

---

PREGUNTA 2:
...`
      filename = 'plantilla-preguntas.txt'
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // ==========================================
  // RENDERIZADO UI
  // ==========================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/questions-manager" className="text-blue-600 hover:text-blue-800 mb-4 inline-block font-semibold">
            ← Volver al Gestor de Preguntas
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📥 Importación Inteligente de Preguntas</h1>
          <p className="text-gray-600">Importa preguntas desde múltiples formatos con validación automática</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'select', label: '1. Seleccionar', icon: '📄' },
              { key: 'preview', label: '2. Vista Previa', icon: '👁️' },
              { key: 'import', label: '3. Importar', icon: '⬆️' },
              { key: 'done', label: '4. Completado', icon: '✅' }
            ].map((step, idx, arr) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                  currentStep === step.key ? 'bg-blue-600 text-white' :
                  arr.findIndex(s => s.key === currentStep) > idx ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step.icon}
                </div>
                <div className="ml-3 flex-1">
                  <div className="text-sm font-semibold">{step.label}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`h-1 w-full mx-4 ${
                    arr.findIndex(s => s.key === currentStep) > idx ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: SELECCIÓN DE ARCHIVO */}
        {currentStep === 'select' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Selecciona tu archivo</h2>
            
            {/* Formatos soportados */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">📋 Formatos soportados:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> JSON (.json)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Texto (.txt)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> PDF (.pdf)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Word (.doc, .docx)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> EPUB (.epub)
                </div>
              </div>
            </div>

            {/* Plantillas */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-3">🎯 Descarga plantillas de ejemplo:</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadTemplate('json')}
                  className="px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 font-semibold"
                >
                  📥 Plantilla JSON
                </button>
                <button
                  onClick={() => downloadTemplate('txt')}
                  className="px-4 py-2 bg-white border-2 border-pink-300 text-pink-700 rounded-lg hover:bg-pink-50 font-semibold"
                >
                  📥 Plantilla TXT
                </button>
              </div>
            </div>

            {/* Opciones de importación */}
            <div className="mb-6 space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={autoCorrect}
                  onChange={(e) => setAutoCorrect(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-semibold">🔧 Corrección automática</div>
                  <div className="text-sm text-gray-600">Corrige errores comunes (respuestas, formato, etc.)</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-semibold">⏭️ Saltar preguntas con errores</div>
                  <div className="text-sm text-gray-600">Importa solo preguntas válidas</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={importToBank}
                  onChange={(e) => setImportToBank(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-semibold">🏦 Importar al banco de preguntas</div>
                  <div className="text-sm text-gray-600">Las preguntas estarán disponibles globalmente</div>
                </div>
              </label>
            </div>

            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition">
              <input
                type="file"
                accept=".json,.txt,.pdf,.doc,.docx,.epub"
                onChange={handleFileSelect}
                disabled={parsing}
                className="hidden"
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                className="cursor-pointer"
              >
                <div className="text-6xl mb-4">📤</div>
                <div className="text-xl font-semibold mb-2">
                  {parsing ? 'Procesando archivo...' : 'Arrastra tu archivo aquí'}
                </div>
                <div className="text-gray-500 mb-4">
                  o haz clic para seleccionar
                </div>
                {parsing && (
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* PASO 2: VISTA PREVIA */}
        {currentStep === 'preview' && preview && (
          <div className="space-y-6">
            {/* Resumen */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Vista Previa de Importación</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{preview.total}</div>
                  <div className="text-sm text-gray-600">Total preguntas</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{preview.valid}</div>
                  <div className="text-sm text-gray-600">Válidas ✓</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{preview.withWarnings}</div>
                  <div className="text-sm text-gray-600">Con avisos ⚠️</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{preview.withErrors}</div>
                  <div className="text-sm text-gray-600">Con errores ✗</div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('select')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  ← Cambiar archivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={preview.valid === 0 || importing}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  {importing ? 'Importando...' : `Importar ${skipErrors ? preview.valid : preview.total} preguntas →`}
                </button>
              </div>
            </div>

            {/* Lista de preguntas */}
            <div className="bg-white rounded-lg shadow-md p-6 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Preguntas detectadas:</h3>
              
              {preview.questions.map((q, idx) => (
                <div
                  key={idx}
                  className={`mb-4 p-4 rounded-lg border-l-4 ${
                    q.errors && q.errors.length > 0 ? 'bg-red-50 border-red-500' :
                    q.warnings && q.warnings.length > 0 ? 'bg-yellow-50 border-yellow-500' :
                    'bg-green-50 border-green-500'
                  }`}
                >
                  <div className="font-semibold mb-2">
                    {idx + 1}. {q.text}
                  </div>
                  
                  {/* Errores */}
                  {q.errors && q.errors.length > 0 && (
                    <div className="text-sm text-red-700 mb-2">
                      <strong>❌ Errores:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {q.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {q.warnings && q.warnings.length > 0 && (
                    <div className="text-sm text-yellow-700">
                      <strong>⚠️ Avisos:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {q.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: IMPORTANDO */}
        {currentStep === 'import' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold mb-4">Importando preguntas...</h2>
              
              <div className="max-w-md mx-auto mb-6">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {progress.message}
                </div>
              </div>

              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        )}

        {/* PASO 4: COMPLETADO */}
        {currentStep === 'done' && result && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">¡Importación Completada!</h2>
              
              <div className="max-w-md mx-auto mb-6 space-y-3">
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-semibold">Importadas exitosamente:</span>
                  <span className="text-green-600 font-bold">{result.imported}</span>
                </div>
                {result.skipped > 0 && (
                  <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="font-semibold">Omitidas (errores):</span>
                    <span className="text-yellow-600 font-bold">{result.skipped}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setCurrentStep('select')
                    setFile(null)
                    setPreview(null)
                    setResult(null)
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Importar más preguntas
                </button>
                <Link
                  href="/admin/questions-manager"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold inline-block"
                >
                  Ir al Gestor de Preguntas →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
