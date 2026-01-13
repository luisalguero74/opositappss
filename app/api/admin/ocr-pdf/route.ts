import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Tesseract from 'tesseract.js'

// Fuerza runtime Node para poder requerir pdf-parse CJS
export const runtime = 'nodejs'

const MAX_FILE_MB = Number(process.env.OCR_MAX_MB ?? '50')
const MAX_PAGES = Number(process.env.OCR_MAX_PAGES ?? '300')
const MIN_TEXT_LENGTH = 100
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS ?? '180000')
const OCR_MAX_OCR_PAGES = Number(process.env.OCR_MAX_OCR_PAGES ?? '30')

const MAX_IMAGE_MB = Number(process.env.OCR_IMAGE_MAX_MB ?? '8')

type PdfTextResult = { text: string; pages: number }

async function extractEmbeddedPdfText(buffer: Buffer): Promise<PdfTextResult> {
  const pdfParseModule = (await import('pdf-parse')) as any
  const pdfParse = pdfParseModule?.default ?? pdfParseModule
  const pdfData = await pdfParse(Buffer.from(buffer))
  return { text: String(pdfData?.text || ''), pages: Number(pdfData?.numpages ?? 0) }
}

async function ocrImage(buffer: Buffer, startedAt: number): Promise<string> {
  const logger = (m: any) => {
    if (m?.status === 'recognizing text' && typeof m?.progress === 'number') {
      const pct = Math.round(m.progress * 100)
      if (pct % 25 === 0) console.log(`OCR progreso ${pct}%`)
    }
  }

  const createWorker = (Tesseract as any)?.createWorker
  if (createWorker) {
    const worker = await createWorker({ logger, cachePath: '/tmp/tesseract' })
    try {
      if (typeof worker.load === 'function') await worker.load()
      if (typeof worker.loadLanguage === 'function') await worker.loadLanguage('spa')
      if (typeof worker.initialize === 'function') await worker.initialize('spa')

      const elapsed = Date.now() - startedAt
      if (elapsed > OCR_TIMEOUT_MS - 5000) {
        throw new Error('OCR timeout (Vercel).')
      }

      const result = await worker.recognize(buffer)
      return String(result?.data?.text || '')
    } finally {
      try {
        await worker.terminate()
      } catch {
        // ignore
      }
    }
  }

  const result = await (Tesseract as any).recognize(buffer, 'spa', { logger })
  return String(result?.data?.text || '')
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const image = formData.get('image') as File
    const pageIndexRaw = formData.get('pageIndex')
    const pageIndex = typeof pageIndexRaw === 'string' ? Number(pageIndexRaw) : undefined

    const startedAt = Date.now()

    // Mode A: OCR a single rendered page image (client-side PDF rendering)
    if (image) {
      const imageBuffer = await image.arrayBuffer()
      const imageSizeMB = imageBuffer.byteLength / 1024 / 1024
      if (imageSizeMB > MAX_IMAGE_MB) {
        return NextResponse.json(
          { error: `Imagen demasiado grande (${imageSizeMB.toFixed(2)} MB). Límite ${MAX_IMAGE_MB} MB.` },
          { status: 413 }
        )
      }

      const text = await ocrImage(Buffer.from(imageBuffer), startedAt)
      return NextResponse.json({
        success: true,
        text: text.trim(),
        length: text.length,
        fileName: image.name,
        meta: {
          usedOCR: true,
          pageIndex: typeof pageIndex === 'number' && Number.isFinite(pageIndex) ? pageIndex : null,
          durationMs: Date.now() - startedAt
        }
      })
    }

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const sizeMB = buffer.byteLength / 1024 / 1024

    if (sizeMB > MAX_FILE_MB) {
      return NextResponse.json({
        error: `Archivo demasiado grande (${sizeMB.toFixed(2)} MB). Límite ${MAX_FILE_MB} MB. Divide el PDF antes de procesar.`
      }, { status: 413 })
    }

    let text = ''
    let pages = 0

    try {
      // Fast path: BOE / PDFs con texto embebido
      const embedded = await extractEmbeddedPdfText(Buffer.from(buffer))
      pages = embedded.pages

      if (pages && pages > MAX_PAGES) {
        return NextResponse.json(
          {
            error: `PDF demasiado largo (${pages} páginas). Límite ${MAX_PAGES} páginas. Divide el PDF antes de procesar.`
          },
          { status: 413 }
        )
      }

      text = embedded.text
    } catch (pdfErr) {
      console.log('Extracción PDF falló:', pdfErr)
    }

    if (!text || text.trim().length < MIN_TEXT_LENGTH) {
      const ocrLimit = Math.min(MAX_PAGES, OCR_MAX_OCR_PAGES)
      return NextResponse.json(
        {
          error: `PDF sin texto embebido (parece escaneado). Para OCR en Vercel, el navegador debe renderizar páginas a imagen y enviarlas. Límite recomendado: ${ocrLimit} páginas.`,
          code: 'OCR_REQUIRED',
          meta: {
            pages,
            ocrMaxPages: ocrLimit,
            sizeMB: Number(sizeMB.toFixed(2))
          }
        },
        { status: 422 }
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No se pudo extraer texto del PDF' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      text: text.trim(),
      length: text.length,
      fileName: file.name,
      meta: {
        pages,
        usedOCR: false,
        ocrMaxPages: OCR_MAX_OCR_PAGES,
        sizeMB: Number(sizeMB.toFixed(2)),
        durationMs: Date.now() - startedAt
      }
    })
  } catch (error) {
    console.error('Error en OCR:', error)
    return NextResponse.json({ 
      error: 'Error al procesar PDF',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
