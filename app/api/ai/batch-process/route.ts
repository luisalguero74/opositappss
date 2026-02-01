import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processDocument } from '@/lib/document-processor'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { action = 'scan', generateQuestions = false } = body

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'Este endpoint depende del filesystem local y no está soportado en producción (Vercel). Ejecuta el batch desde local/NAS o adapta a Backblaze B2 (presigned URLs).',
        },
        { status: 501 }
      )
    }

    const { findAllLocalDocumentsToProcess } = await import('@/lib/local-temario-scan')

    if (action === 'scan') {
      const documents = await findAllLocalDocumentsToProcess()
      return NextResponse.json({
        success: true,
        count: documents.length,
        documents
      })
    }

    if (action === 'process-all') {
      const documents = await findAllLocalDocumentsToProcess()
      const results = {
        processed: 0,
        failed: 0,
        errors: [] as string[]
      }

      const [{ stat }, { join }] = await Promise.all([import('fs/promises'), import('path')])

      for (const doc of documents) {
        try {
          // Verificar si ya existe
          const existing = await prisma.legalDocument.findFirst({
            where: { fileName: doc.fileName }
          })

          if (existing) {
            console.log(`Documento ya procesado: ${doc.fileName}`)
            continue
          }

          console.log(`Procesando: ${doc.fileName}`)
          const processed = await processDocument(doc.filePath, doc.fileName)

          const fullPath = join(process.cwd(), doc.filePath)
          const fileStats = await stat(fullPath)

          await prisma.legalDocument.create({
            data: {
              title: doc.fileName.replace(/\.[^/.]+$/, ''),
              documentType: doc.type,
              topic: doc.topic,
              fileName: doc.fileName,
              fileSize: fileStats.size,
              content: processed.content,
              processedAt: new Date(),
              sections: {
                create: processed.sections.map(section => ({
                  title: section.title,
                  content: section.content,
                  order: section.order
                }))
              }
            }
          })

          results.processed++
          console.log(`✅ Procesado: ${doc.fileName}`)
        } catch (error: any) {
          console.error(`❌ Error en ${doc.fileName}:`, error.message)
          results.failed++
          results.errors.push(`${doc.fileName}: ${error.message}`)
        }
      }

      return NextResponse.json({
        success: true,
        results
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en procesamiento masivo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar' },
      { status: 500 }
    )
  }
}
