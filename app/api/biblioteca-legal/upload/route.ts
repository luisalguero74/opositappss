import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import mammoth from 'mammoth'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/document-processor'

const BIBLIOTECA_DIR = join(process.cwd(), 'documentos-temario', 'biblioteca')

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const providedTitle = (formData.get('title') as string) || null
    const providedType = (formData.get('type') as string) || null
    const providedTopic = (formData.get('topic') as string) || null
    const providedReference = (formData.get('reference') as string) || null
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    // Crear directorio si no existe
    if (!existsSync(BIBLIOTECA_DIR)) {
      await mkdir(BIBLIOTECA_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = join(BIBLIOTECA_DIR, fileName)

    // Guardar archivo
    await writeFile(filePath, buffer)

    // Contar páginas según tipo
    let numeroPaginas = 0
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'pdf') {
      try {
        // Importación dinámica para evitar problemas con pdf-parse
        const pdfParseModule = await import('pdf-parse')
        const { PDFParse } = pdfParseModule;
        const parser = new PDFParse({ data: buffer });
        const info = await parser.getInfo();
        numeroPaginas = info.pages.length;
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

    // Ingestar y extraer texto para el asistente/RAG
    const processed = await processDocument(filePath, fileName)

    const document = await prisma.legalDocument.create({
      data: {
        title: providedTitle || nombreLimpio,
        type: providedType || 'ley',
        topic: providedTopic,
        reference: providedReference || nombreLimpio,
        fileName,
        fileSize: buffer.length,
        content: processed.content,
        processedAt: new Date(),
        sections: {
          create: processed.sections.map((s, idx) => ({
            title: s.title,
            content: s.content,
            order: idx
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      nombre: nombreLimpio,
      archivo: fileName,
      tipo: extension || 'unknown',
      numeroPaginas: processed.metadata.pageCount || numeroPaginas,
      documentId: document.id,
      sections: processed.sections.length
    })
  } catch (error) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
