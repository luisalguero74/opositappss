import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import mammoth from 'mammoth'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/document-processor'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION ||
    process.env.NETLIFY
)

// En serverless (Vercel) el FS del repo es solo lectura; /tmp sí es escribible.
const UPLOAD_DIR = IS_SERVERLESS ? join('/tmp', 'opositappss', 'biblioteca') : join(process.cwd(), 'documentos-temario', 'biblioteca')

const MAX_CONTENT_CHARS = 250_000
const MAX_SECTIONS = 250
const MAX_SECTION_CHARS = 25_000
const PDF_HEAVY_BYTES = 1_500_000

function truncateText(input: string, maxChars: number): string {
  if (!input) return ''
  if (input.length <= maxChars) return input
  return input.slice(0, maxChars) + `\n\n[TRUNCATED ${input.length - maxChars} chars]`
}

function normalizeSections(
  sections: Array<{ title: string; content: string; order: number }>
): Array<{ title: string; content: string; order: number }> {
  if (!Array.isArray(sections) || sections.length === 0) return []

  const sliced = sections.slice(0, MAX_SECTIONS)
  return sliced.map((s, idx) => ({
    title: String(s?.title || `Sección ${idx + 1}`).slice(0, 200),
    content: truncateText(String(s?.content || ''), MAX_SECTION_CHARS),
    order: idx
  }))
}

export async function POST(req: NextRequest) {
  let stage = 'init'
  const requestId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado', stage, requestId }, { status: 401 })
    }

    stage = 'parse_form'
    const formData = await req.formData()
    const file = formData.get('file') as File
    const providedTitle = (formData.get('title') as string) || null
    const providedType = (formData.get('type') as string) || null
    const providedTopic = (formData.get('topic') as string) || null
    const providedReference = (formData.get('reference') as string) || null
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo', stage, requestId }, { status: 400 })
    }

    // Vercel tiene límites estrictos de tamaño en requests; mejor dar un error explícito.
    // (El límite exacto depende del plan/config, pero suele fallar con PDFs grandes.)
    stage = 'size_check'
    if (typeof file.size === 'number' && file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande para subida directa (prueba con un PDF más pequeño o troceado).', stage },
        { status: 413 }
      )
    }

    stage = 'read_file'
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

    console.log(`[BibliotecaLegal Upload][${requestId}] start file=${fileName} bytes=${buffer.length}`)

    stage = 'write_tmp'
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const filePath = join(UPLOAD_DIR, fileName)
    await writeFile(filePath, buffer)

    // Contar páginas según tipo
    stage = 'count_pages'
    let numeroPaginas = 0
    const extension = fileName.split('.').pop()?.toLowerCase()
    const isHeavyPdf = extension === 'pdf' && buffer.length > PDF_HEAVY_BYTES

    if (extension === 'pdf') {
      try {
        if (isHeavyPdf) {
          // Evitar parsing pesado en serverless (puede provocar OOM/timeout en PDFs grandes)
          numeroPaginas = Math.ceil(buffer.length / 3000)
        } else {
        // pdf-parse es una función que acepta un buffer directamente
        const pdfParseModule = (await import('pdf-parse')) as any
        const pdfParse = pdfParseModule.default || pdfParseModule
        const pdfData = await pdfParse(buffer)
        numeroPaginas = pdfData?.numpages || 0
        }
      } catch (error) {
        console.error('Error al procesar PDF:', error)
        numeroPaginas = Math.ceil(buffer.length / 3000)
      }
    } else if (extension === 'txt') {
      const text = buffer.toString('utf-8')
      const lines = text.split('\n').length
      numeroPaginas = Math.ceil(lines / 50)
    } else if (extension === 'doc' || extension === 'docx') {
      try {
        const result = await mammoth.extractRawText({ buffer })
        const lines = result.value.split('\n').length
        numeroPaginas = Math.ceil(lines / 50)
      } catch (error) {
        console.error('Error al procesar DOC:', error)
        numeroPaginas = Math.ceil(buffer.length / 50000)
      }
    } else {
      numeroPaginas = Math.ceil(buffer.length / 50000)
    }

    // Extraer nombre limpio (sin extensión)
    const nombreLimpio = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')

    // Ingestar y extraer texto para el asistente/RAG (best-effort)
    stage = 'extract_text'
    let processed: { content: string; sections: Array<{ title: string; content: string; order: number }>; metadata: { pageCount?: number } }
    try {
      if (isHeavyPdf) {
        processed = {
          content: `PDF subido correctamente (${fileName}). Extracción de texto diferida por tamaño (serverless). Ejecuta re-procesado/embeddings desde Admin cuando te convenga.`,
          sections: [],
          metadata: { pageCount: numeroPaginas }
        }
      } else {
        processed = await processDocument(filePath, fileName)
      }
    } catch (e: any) {
      console.error('[BibliotecaLegal Upload] No se pudo extraer texto; se guardará igualmente el documento:', e)
      processed = {
        content: `No se pudo extraer texto automáticamente de este archivo (${fileName}). Se ha guardado igualmente para vinculación y re-procesado posterior.`,
        sections: [],
        metadata: { pageCount: numeroPaginas }
      }
    }

    const pageCount = processed.metadata.pageCount || numeroPaginas
    const safeContent = truncateText(processed.content, MAX_CONTENT_CHARS)
    const safeSections = normalizeSections(processed.sections)

    console.log(`[BibliotecaLegal Upload][${requestId}] extracted pageCount=${pageCount} sections=${safeSections.length} contentChars=${safeContent.length}`)

    stage = 'db_create'
    let document:
      | { id: string }
      | null = null

    try {
      document = await prisma.legalDocument.create({
        data: {
          title: providedTitle || nombreLimpio,
          documentType: providedType || 'ley',
          topic: providedTopic,
          reference: providedReference || nombreLimpio,
          fileName,
          fileSize: buffer.length,
          metadata: JSON.stringify({
            source: 'biblioteca-legal:upload',
            pageCount,
            bytes: buffer.length,
            uploadedAt: new Date().toISOString(),
            contentTruncated: safeContent.length !== (processed.content || '').length,
            sectionsCount: safeSections.length
          }),
          content: safeContent,
          active: true,
          processedAt: new Date(),
          sections: {
            create: safeSections
          }
        },
        select: { id: true }
      })
    } catch (e1: any) {
      console.error('[BibliotecaLegal Upload] DB create (with sections) failed, retrying without sections:', e1)
      stage = 'db_create_retry_no_sections'
      // Retry: crear solo el documento (sin nested create), para que la subida no falle.
      document = await prisma.legalDocument.create({
        data: {
          title: providedTitle || nombreLimpio,
          documentType: providedType || 'ley',
          topic: providedTopic,
          reference: providedReference || nombreLimpio,
          fileName,
          fileSize: buffer.length,
          metadata: JSON.stringify({
            source: 'biblioteca-legal:upload',
            pageCount,
            bytes: buffer.length,
            uploadedAt: new Date().toISOString(),
            note: 'sections skipped due to create error'
          }),
          content: safeContent,
          active: true,
          processedAt: new Date()
        },
        select: { id: true }
      })
    }

    console.log(`[BibliotecaLegal Upload][${requestId}] success documentId=${document.id}`)

    return NextResponse.json({
      success: true,
      nombre: nombreLimpio,
      archivo: fileName,
      tipo: extension || 'unknown',
      numeroPaginas: pageCount,
      documentId: document.id,
      sections: safeSections.length
    })
  } catch (error: any) {
    console.error('Error al subir archivo:', error)

    const details = error instanceof Error ? error.message : String(error)
    const prismaCode = typeof error?.code === 'string' ? error.code : undefined

    return NextResponse.json(
      {
        error: 'Error al subir archivo',
        details,
        prismaCode,
        stage,
        requestId
      },
      { status: 500 }
    )
  }
}
