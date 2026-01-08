import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener biblioteca completa o por tema
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const temaId = searchParams.get('temaId')

    if (temaId) {
      // Devolver solo los documentos asociados a este tema
      const relaciones = await prisma.temaLegalDocument.findMany({
        where: { temaId },
        include: {
          document: true
        }
      })

      const documentos = relaciones.map(rel => ({
        id: rel.document.id,
        nombre: rel.document.title,
        archivo: rel.document.fileName || '',
        tipo: rel.document.type || 'ley',
        numeroPaginas: Math.floor((rel.document.fileSize || 0) / 1024),
        fechaActualizacion: rel.document.updatedAt.toISOString().split('T')[0]
      }))

      return NextResponse.json({ documentos })
    }

    // Devolver toda la biblioteca
    const documentos = await prisma.legalDocument.findMany({
      where: { active: true },
      include: {
        temas: {
          include: {
            tema: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Construir relaciones { temaId: [docIds] }
    const relaciones: { [temaId: string]: string[] } = {}
    
    documentos.forEach(doc => {
      doc.temas.forEach(relacion => {
        if (!relaciones[relacion.temaId]) {
          relaciones[relacion.temaId] = []
        }
        relaciones[relacion.temaId].push(doc.id)
      })
    })

    const documentosFormateados = documentos.map(doc => ({
      id: doc.id,
      nombre: doc.title,
      archivo: doc.fileName || '',
      tipo: doc.type || 'ley',
      numeroPaginas: Math.floor((doc.fileSize || 0) / 1024),
      fechaActualizacion: doc.updatedAt.toISOString().split('T')[0]
    }))

    return NextResponse.json({
      documentos: documentosFormateados,
      relaciones
    })
  } catch (error) {
    console.error('Error al leer biblioteca:', error)
    return NextResponse.json({ documentos: [], relaciones: {} })
  }
}

// POST - Agregar documento a la biblioteca o asociar con tema
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    if (body.action === 'add-documento') {
      // Agregar nuevo documento
      const nuevoDoc = await prisma.legalDocument.create({
        data: {
          title: body.nombre,
          type: body.tipo || 'ley',
          fileName: body.archivo,
          fileSize: (body.numeroPaginas || 0) * 1024,
          content: `Documento añadido desde Biblioteca Legal: ${body.nombre}`,
          active: true,
          processedAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true, 
        documento: {
          id: nuevoDoc.id,
          nombre: nuevoDoc.title,
          archivo: nuevoDoc.fileName || '',
          tipo: nuevoDoc.type || 'ley',
          numeroPaginas: Math.floor((nuevoDoc.fileSize || 0) / 1024),
          fechaActualizacion: nuevoDoc.updatedAt.toISOString().split('T')[0]
        }
      })
    }

    if (body.action === 'asociar-tema') {
      // Asociar documentos a un tema
      const { temaId, documentosIds } = body

      // Eliminar asociaciones anteriores de este tema
      await prisma.temaLegalDocument.deleteMany({
        where: { temaId }
      })

      // Crear nuevas asociaciones
      if (documentosIds && documentosIds.length > 0) {
        await prisma.temaLegalDocument.createMany({
          data: documentosIds.map((docId: string) => ({
            temaId,
            documentId: docId
          })),
          skipDuplicates: true
        })
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === 'delete-documento') {
      // Eliminar documento (las relaciones se eliminan por CASCADE)
      await prisma.legalDocument.update({
        where: { id: body.id },
        data: { active: false } // Soft delete
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar biblioteca:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
