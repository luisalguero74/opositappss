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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

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
    let usedOCR = false
    const startedAt = Date.now()
    
    try {
      // Intentar primero extraer con pdf-parse (más rápido)
      const pdfParseModule = (await import('pdf-parse')) as any
      const pdfParse = pdfParseModule?.default ?? pdfParseModule
      const pdfData = await pdfParse(Buffer.from(buffer))
      pages = pdfData.numpages ?? 0

      if (pages && pages > MAX_PAGES) {
        return NextResponse.json({
          error: `PDF demasiado largo (${pages} páginas). Límite ${MAX_PAGES} páginas. Divide el PDF antes de procesar.`
        }, { status: 413 })
      }

      text = pdfData.text
      
      // Si no hay contenido de texto, usar OCR
      if (!text || text.trim().length < MIN_TEXT_LENGTH) {
        console.log('PDF sin texto embebido, usando OCR...')
        usedOCR = true
        text = await extractWithOCR(Buffer.from(buffer))
      }
    } catch (pdfErr) {
      // Si pdf-parse falla, usar OCR
      console.log('PDF parse falló, usando OCR...', pdfErr)
      usedOCR = true
      text = await extractWithOCR(Buffer.from(buffer))
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
        usedOCR,
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

async function extractWithOCR(buffer: Buffer): Promise<string> {
  console.log('🔍 Iniciando OCR...')
  
  try {
    const ocrPromise = Tesseract.recognize(buffer, 'spa', {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          // Log progresos clave para seguimiento en servidor
          const pct = Math.round(m.progress * 100)
          if (pct % 25 === 0) {
            console.log(`OCR progreso ${pct}%`)
          }
        }
      }
    })

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT_MS)
    })

    const result = (await Promise.race([ocrPromise, timeout])) as any
    
    if (result?.data?.text) {
      return result.data.text
    }
    
    return ''
  } catch (error) {
    console.error('Error en OCR Tesseract:', error)
    throw error
  }
}
