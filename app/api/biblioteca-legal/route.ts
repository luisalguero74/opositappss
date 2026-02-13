import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDbSchemaSelfHeal } from '@/lib/db-self-heal'

function isAdminRole(role: unknown): boolean {
  return typeof role === 'string' && role.toLowerCase() === 'admin'
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// GET - Obtener biblioteca completa o por tema
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await ensureDbSchemaSelfHeal()

    const { searchParams } = new URL(req.url)
    const temaId = searchParams.get('temaId')

    if (temaId) {
      const relaciones = await prisma.temaLegalDocument.findMany({
        where: { temaId },
        select: { documentId: true }
      })

      const documentosIds = relaciones.map(r => r.documentId)
      const documentosDb = await prisma.legalDocument.findMany({
        where: { id: { in: documentosIds }, active: true },
        orderBy: { updatedAt: 'desc' }
      })

      const documentos = documentosDb.map(d => ({
        id: d.id,
        nombre: d.title,
        archivo: d.fileName ?? '',
        tipo: d.documentType,
        numeroPaginas: 0,
        fechaActualizacion: toDateString(d.updatedAt)
      }))

      return NextResponse.json({ documentos })
    }

    const documentosDb = await prisma.legalDocument.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'desc' }
    })

    const relacionesDb = await prisma.temaLegalDocument.findMany({
      select: { temaId: true, documentId: true }
    })

    const relaciones: Record<string, string[]> = {}
    for (const r of relacionesDb) {
      if (!relaciones[r.temaId]) relaciones[r.temaId] = []
      relaciones[r.temaId].push(r.documentId)
    }

    const documentos = documentosDb.map(d => ({
      id: d.id,
      nombre: d.title,
      archivo: d.fileName ?? '',
      tipo: d.documentType,
      numeroPaginas: 0,
      fechaActualizacion: toDateString(d.updatedAt)
    }))

    return NextResponse.json({ documentos, relaciones })
  } catch (error) {
    console.error('Error al leer biblioteca:', error)
    return NextResponse.json({ documentos: [], relaciones: {} })
  }
}

// POST - Agregar documento a la biblioteca
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await ensureDbSchemaSelfHeal()

    const body = await req.json()
    if (body.action === 'add-documento') {
      // Compatibilidad: algunos clientes antiguos hacen POST tras /upload.
      // Si ya existe un LegalDocument con el mismo fileName, no duplicamos.
      const fileName = typeof body.archivo === 'string' ? body.archivo : null
      const title = typeof body.nombre === 'string' ? body.nombre : null
      const type = typeof body.tipo === 'string' ? body.tipo : 'ley'

      if (fileName) {
        const existing = await prisma.legalDocument.findFirst({
          where: { fileName, active: true }
        })
        if (existing) return NextResponse.json({ success: true, documentoId: existing.id })
      }

      const created = await prisma.legalDocument.create({
        data: {
          title: title ?? `Documento ${new Date().toISOString()}`,
          documentType: type,
          reference: title ?? undefined,
          fileName: fileName ?? undefined,
          fileSize: typeof body.fileSize === 'number' ? body.fileSize : undefined,
          content: '',
          processedAt: null
        }
      })

      return NextResponse.json({ success: true, documentoId: created.id })
    }

    if (body.action === 'asociar-tema') {
      // Asociar documentos a un tema
      const { temaId, documentosIds } = body
      if (typeof temaId !== 'string' || !Array.isArray(documentosIds)) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.temaLegalDocument.deleteMany({ where: { temaId } }),
        prisma.temaLegalDocument.createMany({
          data: documentosIds
            .filter((id: unknown): id is string => typeof id === 'string')
            .map((documentId: string) => ({ temaId, documentId })),
          skipDuplicates: true
        })
      ])

      return NextResponse.json({ success: true })
    }

    if (body.action === 'delete-documento') {
      const id = body.id
      if (typeof id !== 'string') {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.temaLegalDocument.deleteMany({ where: { documentId: id } }),
        prisma.legalDocument.update({ where: { id }, data: { active: false } })
      ])

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar biblioteca:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
