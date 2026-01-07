'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

const MAX_FILE_MB = 50

type OcrMeta = {
  pages?: number
  usedOCR?: boolean
  sizeMB?: number
  durationMs?: number
}

export default function OCRConverterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'upload' | 'preview' | 'save'>('upload')
  const [saveType, setSaveType] = useState<'temario' | 'biblioteca'>('temario')
  const [selectedTema, setSelectedTema] = useState<string>('')
  const [docName, setDocName] = useState('')
  const [docDescription, setDocDescription] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [meta, setMeta] = useState<OcrMeta | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF')
      return
    }

    const sizeMb = selectedFile.size / 1024 / 1024
    if (sizeMb > MAX_FILE_MB) {
      setError(`El archivo pesa ${sizeMb.toFixed(2)} MB. Límite ${MAX_FILE_MB} MB. Divide el PDF antes de procesar.`)
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const handleExtract = async () => {
    if (!file) {
      setError('Selecciona un archivo primero')
      return
    }

    setLoading(true)
    setError('')
    setStatusMsg('Subiendo PDF...')
    setMeta(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      setStatusMsg('Extrayendo texto (intento rápido)...')
      const res = await fetch('/api/admin/ocr-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al extraer texto')
      }

      setExtractedText(data.text)
      setDocName(file.name.replace('.pdf', ''))
      setMeta(data.meta ?? null)
      setStatusMsg(data.meta?.usedOCR ? 'OCR completado' : 'Texto embebido extraído')
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatusMsg('')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      if (saveType === 'temario') {
        if (!selectedTema) {
          setError('Selecciona un tema del temario')
          setLoading(false)
          return
        }

        const response = await fetch('/api/temario/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'agregar-archivo-ocr',
            temaId: selectedTema,
            nombreArchivo: `${docName}.txt`,
            contenido: extractedText
          })
        })

        if (!response.ok) {
          throw new Error('Error al guardar en temario')
        }

        alert(`✅ Guardado en temario correctamente (${extractedText.length} caracteres)`)
      } else {
        // Guardar en biblioteca legal
        const response = await fetch('/api/admin/biblioteca-legal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'crear-documento',
            titulo: docName,
            descripcion: docDescription,
            contenido: extractedText,
            tipo: 'ocr',
            archivo: `${docName}.txt`
          })
        })

        if (!response.ok) {
          throw new Error('Error al guardar en biblioteca')
        }

        alert(`✅ Guardado en biblioteca legal correctamente (${extractedText.length} caracteres)`)
      }

      // Reset
      setFile(null)
      setExtractedText('')
      setStep('upload')
      setSelectedTema('')
      setDocName('')
      setDocDescription('')
      setMeta(null)
      setStatusMsg('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📄 Conversor OCR de PDF</h1>
          <p className="text-gray-600">Extrae texto de PDFs y guarda en Temarios o Biblioteca Legal</p>
        </div>

        {/* Progreso */}
        <div className="mb-8 flex gap-4">
          <div className={`flex-1 p-4 rounded-lg border-2 ${step === 'upload' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="text-2xl mb-2">📤</div>
            <p className="font-semibold text-gray-800">Paso 1: Subir PDF</p>
          </div>
          <div className={`flex-1 p-4 rounded-lg border-2 ${step === 'preview' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="text-2xl mb-2">👁️</div>
            <p className="font-semibold text-gray-800">Paso 2: Vista Previa</p>
          </div>
          <div className={`flex-1 p-4 rounded-lg border-2 ${step === 'save' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="text-2xl mb-2">💾</div>
            <p className="font-semibold text-gray-800">Paso 3: Guardar</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {statusMsg && (
          <div className="bg-blue-50 border-2 border-blue-200 text-blue-800 p-4 rounded-lg mb-6">
            {statusMsg}
          </div>
        )}

        {/* PASO 1: Upload */}
        {step === 'upload' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Selecciona un PDF</h2>
            
            <div className="border-4 border-dashed border-gray-300 rounded-lg p-16 text-center mb-6 hover:border-blue-500 transition">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-input"
              />
              <label htmlFor="pdf-input" className="cursor-pointer block">
                <div className="text-6xl mb-4">📑</div>
                <p className="text-2xl font-bold text-gray-700 mb-2">Selecciona un PDF</p>
                <p className="text-gray-500">o arrastra un archivo aquí</p>
              </label>
            </div>

            {file && (
              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg mb-6">
                <p className="text-lg font-semibold text-blue-900">✓ {file.name}</p>
                <p className="text-blue-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                {file.size / 1024 / 1024 > 20 && (
                  <p className="text-amber-700 mt-1">Archivo pesado: puede tardar más en OCR.</p>
                )}
              </div>
            )}

            <button
              onClick={handleExtract}
              disabled={!file || loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition text-lg"
            >
              {loading ? '⏳ Extrayendo texto...' : '✂️ Extraer Texto con OCR'}
            </button>
          </div>
        )}

        {/* PASO 2: Preview */}
        {step === 'preview' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Vista Previa del Texto Extraído</h2>
            <p className="text-gray-600 mb-2">{extractedText.length} caracteres extraídos</p>
            {meta && (
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                {meta.pages ? <p>📄 Páginas detectadas: {meta.pages}</p> : null}
                {meta.sizeMB ? <p>💾 Tamaño: {meta.sizeMB.toFixed(2)} MB</p> : null}
                {typeof meta.usedOCR !== 'undefined' ? (
                  <p>🧠 Modo: {meta.usedOCR ? 'OCR (sin texto embebido)' : 'Texto embebido'}</p>
                ) : null}
                {meta.durationMs ? <p>⏱️ Tiempo: {(meta.durationMs / 1000).toFixed(1)} s</p> : null}
              </div>
            )}
            
            <div className="bg-gray-50 border-2 border-gray-200 p-6 rounded-lg max-h-64 overflow-y-auto mb-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
                {extractedText.substring(0, 1000)}
                {extractedText.length > 1000 && '\n\n... (más contenido)'}
              </pre>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                ← Volver
              </button>
              <button
                onClick={() => setStep('save')}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
              >
                ✓ Siguiente: Guardar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Guardar */}
        {step === 'save' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">¿Dónde deseas guardar?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Temarios */}
              <div
                onClick={() => setSaveType('temario')}
                className={`p-6 rounded-lg border-4 cursor-pointer transition ${
                  saveType === 'temario'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-3">📚</div>
                <p className="text-xl font-bold text-gray-800 mb-2">Temarios Oficiales</p>
                <p className="text-gray-600 text-sm">Asocia el contenido a un tema específico del temario</p>
              </div>

              {/* Biblioteca Legal */}
              <div
                onClick={() => setSaveType('biblioteca')}
                className={`p-6 rounded-lg border-4 cursor-pointer transition ${
                  saveType === 'biblioteca'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                <div className="text-4xl mb-3">📖</div>
                <p className="text-xl font-bold text-gray-800 mb-2">Biblioteca Legal</p>
                <p className="text-gray-600 text-sm">Guarda como documento legal independiente</p>
              </div>
            </div>

            {/* Opciones según tipo */}
            {saveType === 'temario' && (
              <div className="bg-blue-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
                <label className="block text-gray-700 font-bold mb-3">Selecciona un Tema:</label>
                <select
                  value={selectedTema}
                  onChange={(e) => setSelectedTema(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg font-semibold text-gray-700"
                >
                  <option value="">-- Selecciona un tema --</option>
                  <optgroup label="📘 Temario General">
                    {TEMARIO_OFICIAL.filter(t => t.categoria === 'general').map(tema => (
                      <option key={tema.id} value={tema.id}>
                        Tema {tema.numero}: {tema.titulo}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📕 Temario Específico">
                    {TEMARIO_OFICIAL.filter(t => t.categoria === 'especifico').map(tema => (
                      <option key={tema.id} value={tema.id}>
                        Tema {tema.numero}: {tema.titulo}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {saveType === 'biblioteca' && (
              <div className="bg-green-50 p-6 rounded-lg mb-6 border-2 border-green-200 space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Nombre del Documento:</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg text-gray-700"
                    placeholder="Ej: Decreto Regulador de Pensiones"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Descripción (opcional):</label>
                  <textarea
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg text-gray-700"
                    rows={3}
                    placeholder="Descripción breve del contenido"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('preview')}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                ← Volver
              </button>
              <button
                onClick={handleSave}
                disabled={loading || (saveType === 'temario' && !selectedTema) || (saveType === 'biblioteca' && !docName)}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
