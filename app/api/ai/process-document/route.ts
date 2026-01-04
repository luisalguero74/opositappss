import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processDocument } from '@/lib/document-processor'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

    // Procesar documento
    console.log(`Procesando documento: ${fileName}`)
    const processed = await processDocument(filePath, fileName)

    // Obtener tamaño del archivo
    const fullPath = join(process.cwd(), filePath)
    const stats = await readFile(fullPath).then(b => ({ size: b.length }))

    // Guardar en base de datos
    const document = await prisma.legalDocument.create({
      data: {
        title: fileName.replace(/\.[^/.]+$/, ''),
        type: type || 'temario_general',
        topic,
        reference,
        fileName,
        fileSize: stats.size,
        content: processed.content,
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
