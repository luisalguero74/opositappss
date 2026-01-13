'use client'

import { useState } from 'react'

interface OCRModalProps {
  temaId: string
  temaTitulo: string
  onClose: () => void
  onSuccess: (text: string, temaId: string) => void
}

export default function OCRModal({ temaId, temaTitulo, onClose, onSuccess }: OCRModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload')

  const renderPdfPageToPngBlob = async (page: any, scale: number): Promise<Blob> => {
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo crear contexto de canvas para OCR')

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    await page.render({ canvasContext: context, viewport }).promise

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('No se pudo convertir la página a imagen para OCR')

    canvas.width = 0
    canvas.height = 0

    return blob
  }

  const ocrPdfInBrowserThenServer = async (pdfFile: File, maxPages: number) => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf')) as any
    const data = new Uint8Array(await pdfFile.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data, disableWorker: true })
    const pdf = await loadingTask.promise
    const totalPages = Number(pdf?.numPages ?? 0)
    const pagesToProcess = Math.min(totalPages || 0, maxPages)

    if (!pagesToProcess) throw new Error('No se pudieron detectar páginas del PDF')

    let out = ''
    for (let pageIndex = 1; pageIndex <= pagesToProcess; pageIndex++) {
      setStatusMsg(`PDF escaneado: renderizando página ${pageIndex}/${pagesToProcess}...`)
      const page = await pdf.getPage(pageIndex)
      const pngBlob = await renderPdfPageToPngBlob(page, 2)

      setStatusMsg(`PDF escaneado: OCR en servidor ${pageIndex}/${pagesToProcess}...`)
      const formData = new FormData()
      formData.append('image', pngBlob, `page-${pageIndex}.png`)
      formData.append('pageIndex', String(pageIndex))

      const res = await fetch('/api/admin/ocr-pdf', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Error OCR en página ${pageIndex}`)

      out += `\n\n[Página ${pageIndex}/${pagesToProcess}]\n${String(data?.text || '')}`
    }

    return out.trim()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setError('')
    } else {
      setError('Por favor selecciona un archivo PDF')
    }
  }

  const handleExtract = async () => {
    if (!file) {
      setError('Selecciona un archivo primero')
      return
    }

    setLoading(true)
    setError('')
    setStatusMsg('Subiendo PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      setStatusMsg('Extrayendo texto (intento rápido)...')
      const res = await fetch('/api/admin/ocr-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data?.code === 'OCR_REQUIRED') {
          const maxPages = Number(data?.meta?.ocrMaxPages ?? 30)
          const pagesHint = Number(data?.meta?.pages ?? 0)
          if (pagesHint && pagesHint > maxPages) {
            throw new Error(`PDF escaneado (${pagesHint} páginas). OCR recomendado hasta ${maxPages} páginas. Divide el PDF.`)
          }

          const text = await ocrPdfInBrowserThenServer(file, maxPages)
          setStatusMsg('OCR completado')
          setExtractedText(text)
          setStep('preview')
          return
        }

        throw new Error(data?.error || 'Error al extraer texto')
      }

      setExtractedText(String(data?.text || ''))
      setStatusMsg('Texto extraído')
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatusMsg('')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onSuccess(extractedText, temaId)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">📄 OCR - Extraer Texto de PDF</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Tema: <strong>{temaTitulo}</strong>
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-input"
                />
                <label htmlFor="pdf-input" className="cursor-pointer">
                  <div className="text-4xl mb-2">📑</div>
                  <p className="font-semibold text-gray-700">Selecciona un PDF</p>
                  <p className="text-sm text-gray-500">o arrastra un archivo aquí</p>
                </label>
              </div>

              {file && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">✓ {file.name}</p>
                  <p className="text-xs text-blue-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-3 rounded border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {statusMsg && !error && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-blue-900 text-sm">
                  {statusMsg}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExtract}
                  disabled={!file || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '⏳ Extrayendo...' : '✂️ Extraer Texto'}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Texto extraído ({extractedText.length} caracteres):</p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                    {extractedText.substring(0, 500)}
                    {extractedText.length > 500 && '...'}
                  </pre>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓ Guardar Texto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
