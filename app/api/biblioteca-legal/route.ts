import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bibliotecaBundled from '../../../data/biblioteca-legal.json'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BibliotecaJSON = {
  documentos: Array<{
    id: string
    nombre: string
    archivo: string
    tipo: string
    numeroPaginas: number
    fechaActualizacion: string
  }>
  relaciones: Record<string, string[]>
}

function normalizeDocumentType(raw: string | null | undefined): string {
  const base = String(raw || '').trim().toLowerCase()
  if (!base) return 'ley'
  const noAccents = base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  const simplified = noAccents
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (simplified.includes('constitucion')) return 'constitucion'
  if (simplified.includes('real_decreto_legislativo')) return 'real_decreto_legislativo'
  if (simplified.includes('real_decreto')) return 'real_decreto'
  if (simplified === 'pdf') return 'ley'
  if (simplified === 'ley') return 'ley'
  return simplified || 'ley'
}

function extractPageCount(fileSize: number | null | undefined, metadata: string | null | undefined): number {
  try {
    if (metadata) {
      const parsed = JSON.parse(metadata)
      const fromMeta = parsed?.pageCount ?? parsed?.numeroPaginas
      const n = typeof fromMeta === 'number' ? fromMeta : Number(fromMeta)
      if (Number.isFinite(n) && n > 0) return Math.floor(n)
    }
  } catch {
    // ignore invalid JSON
  }

  // Backward-compat: en migraciones antiguas se usaba fileSize ~ (paginas*1024)
  const approx = Math.floor((fileSize || 0) / 1024)
  return approx > 0 ? approx : 0
}

async function syncBibliotecaFromBundledJson(): Promise<{ synced: number; relations: number } | null> {
  try {
    const biblioteca = bibliotecaBundled as unknown as BibliotecaJSON

    if (!biblioteca?.documentos?.length) {
      return { synced: 0, relations: 0 }
    }

    const documentIdByLegacyId = new Map<string, string>()
    let synced = 0

    for (const doc of biblioteca.documentos) {
      const archivo = String(doc.archivo || '').trim()
      if (!archivo) continue

      const existing = await prisma.legalDocument.findFirst({
        where: { fileName: archivo },
        select: { id: true }
      })

      if (existing?.id) {
        documentIdByLegacyId.set(doc.id, existing.id)
        continue
      }

      const created = await prisma.legalDocument.create({
        data: {
          title: doc.nombre,
          documentType: normalizeDocumentType(doc.tipo),
          content: `Documento migrado automáticamente desde data/biblioteca-legal.json: ${doc.nombre}`,
          metadata: JSON.stringify({
            source: 'bundled-json',
            legacyId: doc.id,
            numeroPaginas: doc.numeroPaginas,
            fechaActualizacion: doc.fechaActualizacion
          }),
          fileName: archivo,
          fileSize: (doc.numeroPaginas || 0) * 1024,
          active: true,
          reference: doc.nombre,
          processedAt: doc.fechaActualizacion ? new Date(doc.fechaActualizacion) : new Date()
        }
      })

      documentIdByLegacyId.set(doc.id, created.id)
      synced++
    }

    // Relaciones tema-documento (best-effort)
    let relations = 0
    const relationRows: Array<{ temaId: string; documentId: string }> = []
    for (const [temaId, legacyDocIds] of Object.entries(biblioteca.relaciones || {})) {
      for (const legacyId of legacyDocIds || []) {
        const newId = documentIdByLegacyId.get(legacyId)
        if (newId) {
          relationRows.push({ temaId, documentId: newId })
        }
      }
    }

    if (relationRows.length) {
      // Filtrar solo temas existentes para no fallar por FK
      const uniqueTemaIds = Array.from(new Set(relationRows.map(r => r.temaId)))
      const existingTemas = await prisma.temaOficial.findMany({
        where: { id: { in: uniqueTemaIds } },
        select: { id: true }
      })
      const existingTemaSet = new Set(existingTemas.map(t => t.id))
      const filtered = relationRows.filter(r => existingTemaSet.has(r.temaId))

      if (filtered.length) {
        const res = await prisma.temaLegalDocument.createMany({
          data: filtered,
          skipDuplicates: true
        })
        relations = res.count
      }
    }

    return { synced, relations }
  } catch (e) {
    console.error('[BibliotecaLegal] Auto-sync from bundled JSON failed:', e)
    return null
  }
}

// GET - Obtener biblioteca completa o por tema
export async function GET(req: NextRequest) {
  const requestId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const temaId = searchParams.get('temaId')

    if (temaId) {
      // Devolver solo los documentos asociados a este tema
      // Nota: usamos queries defensivas porque en producción pueden existir filas legacy con NULL
      // en campos que Prisma considera required, lo que rompe el findMany y aparenta que "no hay documentos".
      const relaciones = await prisma.temaLegalDocument.findMany({
        where: { temaId },
        select: { documentId: true }
      })

      const documentIds = relaciones.map(r => r.documentId)
      if (documentIds.length === 0) {
        return NextResponse.json({ documentos: [] })
      }

      const documentos = await prisma.$queryRaw<
        Array<{
          id: string
          title: string
          fileName: string | null
          documentType: string | null
          fileSize: number | null
          metadata: string | null
          updatedAt: Date
        }>
      >`
        SELECT
          "id",
          "title",
          "fileName",
          "documentType",
          "fileSize",
          "metadata",
          "updatedAt"
        FROM "LegalDocument"
        WHERE id = ANY(${documentIds})
          AND COALESCE("active", true) = true
        ORDER BY "createdAt" DESC
      `

      const documentosFormateados = documentos.map(doc => ({
        id: doc.id,
        nombre: doc.title,
        archivo: doc.fileName || '',
        tipo: doc.documentType || 'ley',
        numeroPaginas: extractPageCount(doc.fileSize, doc.metadata),
        fechaActualizacion: new Date(doc.updatedAt).toISOString().split('T')[0]
      }))

      return NextResponse.json({ documentos: documentosFormateados })
    }

    // Devolver toda la biblioteca
    // Query defensiva: evita que una sola fila legacy con NULL haga fallar todo el listado.
    let documentos = await prisma.$queryRaw<
      Array<{
        id: string
        title: string
        fileName: string | null
        documentType: string | null
        fileSize: number | null
        metadata: string | null
        updatedAt: Date
      }>
    >`
      SELECT
        "id",
        "title",
        "fileName",
        "documentType",
        "fileSize",
        "metadata",
        "updatedAt"
      FROM "LegalDocument"
      WHERE COALESCE("active", true) = true
      ORDER BY "createdAt" DESC
    `

    // Si está vacío, intentar auto-migración desde JSON empaquetado (evita "desapariciones" al venir de filesystem/JSON).
    if (documentos.length === 0) {
      await syncBibliotecaFromBundledJson()

      documentos = await prisma.$queryRaw<
        Array<{
          id: string
          title: string
          fileName: string | null
          documentType: string | null
          fileSize: number | null
          metadata: string | null
          updatedAt: Date
        }>
      >`
        SELECT
          "id",
          "title",
          "fileName",
          "documentType",
          "fileSize",
          "metadata",
          "updatedAt"
        FROM "LegalDocument"
        WHERE COALESCE("active", true) = true
        ORDER BY "createdAt" DESC
      `
    }

    const docIds = documentos.map(d => d.id)
    // Query defensiva: en producción puede haber filas legacy/corruptas con NULL
    // que hacen que Prisma falle al hidratar resultados.
    const relacionesRows = docIds.length
      ? await prisma.$queryRaw<
          Array<{
            temaId: string | null
            documentId: string | null
          }>
        >`
          SELECT "temaId", "documentId"
          FROM "TemaLegalDocument"
          WHERE "documentId" = ANY(${docIds})
            AND "temaId" IS NOT NULL
            AND "documentId" IS NOT NULL
        `
      : []

    // Construir relaciones { temaId: [docIds] }
    const relaciones: { [temaId: string]: string[] } = {}
    for (const row of relacionesRows) {
      const temaId = row.temaId
      const documentId = row.documentId
      if (!temaId || !documentId) continue

      if (!relaciones[temaId]) {
        relaciones[temaId] = []
      }
      relaciones[temaId].push(documentId)
    }

    const documentosFormateados = documentos.map(doc => ({
      id: doc.id,
      nombre: doc.title,
      archivo: doc.fileName || '',
      tipo: doc.documentType || 'ley',
      numeroPaginas: extractPageCount(doc.fileSize, doc.metadata),
      fechaActualizacion: new Date(doc.updatedAt).toISOString().split('T')[0]
    }))

    return NextResponse.json({
      documentos: documentosFormateados,
      relaciones
    })
  } catch (error) {
    console.error(`[BibliotecaLegal][${requestId}] Error al leer biblioteca:`, error)
    return NextResponse.json(
      { error: 'Error al leer biblioteca', requestId },
      { status: 500 }
    )
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
          documentType: body.tipo || 'ley',
          fileName: body.archivo,
          fileSize: (body.numeroPaginas || 0) * 1024,
          content: `Documento añadido desde Biblioteca Legal: ${body.nombre}`,
          metadata: JSON.stringify({
            source: 'biblioteca-legal:add-documento',
            numeroPaginas: body.numeroPaginas || 0,
            fechaActualizacion: body.fechaActualizacion || null
          }),
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
          tipo: nuevoDoc.documentType || 'ley',
          numeroPaginas: extractPageCount(nuevoDoc.fileSize, nuevoDoc.metadata),
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
