import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getB2DownloadUrl } from '@/lib/b2'
import { logRepoDocumentAccess } from '@/lib/repository'

// Endpoint para generar una URL de descarga temporal para un documento del repositorio.
// IMPORTANTE: requiere que las tablas RepoFolder/RepoDocument/RepoDocumentAccessLog existan en BD.
// No está conectado todavía a la UI en producción hasta que la migración y los datos estén listos.

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Falta el identificador del documento' }, { status: 400 })
    }

    const document = await prisma.repoDocument.findUnique({
      where: { id },
    })

    if (!document || !document.isActive) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    if (!document.allowDownload) {
      return NextResponse.json({ error: 'Descarga no permitida para este documento' }, { status: 403 })
    }

    if (!document.storagePath) {
      return NextResponse.json({ error: 'Documento sin ruta de almacenamiento configurada' }, { status: 500 })
    }

    const b2Url = await getB2DownloadUrl({ key: document.storagePath })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    await logRepoDocumentAccess({
      documentId: document.id,
      userId: session.user.id,
      action: 'download',
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.redirect(b2Url)
  } catch (error) {
    console.error('[Repository Download] Error:', error)
    return NextResponse.json({ error: 'Error al generar enlace de descarga' }, { status: 500 })
  }
}
