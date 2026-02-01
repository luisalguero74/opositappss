import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processDocument } from '@/lib/document-processor'
import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'

// Procesar documento y guardarlo en BD
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { filePath, fileName, type, topic, reference } = body

    if (!filePath || !fileName) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'Este endpoint depende del filesystem local y no está soportado en producción (Vercel). Sube el documento a Backblaze B2/Supabase Storage y adapta el procesado para leer desde URL firmada.',
        },
        { status: 501 }
      )
    }

    // Procesar documento
    console.log(`Procesando documento: ${fileName}`)
    const processed = await processDocument(filePath, fileName)

    // Obtener tamaño del archivo (solo local)
    const [{ stat }, { join }] = await Promise.all([import('fs/promises'), import('path')])
    const fullPath = join(process.cwd(), filePath)
    const stats = await stat(fullPath)

    // Generar embedding automáticamente
    let embeddingString: string | null = null
    try {
      console.log('🔄 Generando embedding automático...')
      const embeddingText = `${fileName.replace(/\.[^/.]+$/, '')}\n\n${processed.content}`
      const embeddingArray = await generateEmbedding(embeddingText)
      
      if (embeddingArray && embeddingArray.length > 0) {
        embeddingString = JSON.stringify(embeddingArray)
        console.log(`✅ Embedding generado (${embeddingArray.length} dimensiones)`)
      } else {
        console.warn('⚠️  No se pudo generar embedding, documento se guardará sin embedding')
      }
    } catch (embError) {
      console.warn('⚠️  Error generando embedding (documento se guardará sin embedding):', embError)
      // Continuar sin embedding - no es crítico
    }

    // Guardar en base de datos
    const document = await prisma.legalDocument.create({
      data: {
        title: fileName.replace(/\.[^/.]+$/, ''),
        documentType: type || 'temario_general',
        topic,
        reference,
        fileName,
        fileSize: stats.size,
        content: processed.content,
        embedding: embeddingString,
        processedAt: new Date(),
        sections: {
          create: processed.sections.map(section => ({
            title: section.title,
            content: section.content,
            order: section.order
          }))
        }
      },
      include: {
        sections: true
      }
    })

    console.log(`Documento procesado: ${document.id}`)
    console.log(`Secciones creadas: ${document.sections.length}`)
    console.log(`Embedding: ${embeddingString ? '✅ Generado' : '⚠️  No generado'}`)

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        sections: document.sections.length,
        contentLength: document.content.length
      }
    })
  } catch (error: any) {
    console.error('Error procesando documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar documento' },
      { status: 500 }
    )
  }
}

// Obtener documentos procesados
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('id')

    if (documentId) {
      // Obtener documento específico con secciones
      const document = await prisma.legalDocument.findUnique({
        where: { id: documentId },
        include: {
          sections: {
            orderBy: { order: 'asc' }
          },
          questions: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!document) {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      }

      return NextResponse.json({ document })
    }

    // Listar todos los documentos
    const documents = await prisma.legalDocument.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            sections: true,
            questions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error obteniendo documentos:', error)
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    )
  }
}
