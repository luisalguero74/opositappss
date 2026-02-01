import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    const repoRole = String(session?.user?.repoRole || '').toUpperCase()
    const canEdit = role === 'admin' || repoRole === 'EDITOR'
    if (!session?.user || !canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const folderKey = String(body?.folderId || '')
    const folderName = String(body?.folderName || '')
    const folderDescription = body?.folderDescription != null ? String(body.folderDescription) : null
    const title = String(body?.title || '')
    const fileName = String(body?.fileName || '')
    const storagePath = String(body?.storagePath || '')
    const storageBucket = body?.storageBucket ? String(body.storageBucket) : null
    const allowDownload = Boolean(body?.allowDownload)

    if (!folderKey || !title || !fileName || !storagePath) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 })
    }

    // Admin UI historically used stable folder codes (e.g. "temario-adams") rather than DB IDs.
    // Accept both: first try id, then code, and auto-create if missing.
    const existingById = await prisma.repoFolder.findUnique({
      where: { id: folderKey },
      select: { id: true },
    })

    const folder = existingById
      ? { id: existingById.id }
      : await prisma.repoFolder.upsert({
          where: { code: folderKey },
          update: {
            name: folderName || folderKey,
            description: folderDescription || null,
          },
          create: {
            code: folderKey,
            name: folderName || folderKey,
            description: folderDescription || null,
          },
          select: { id: true },
        })

    const document = await prisma.repoDocument.create({
      data: {
        folderId: folder.id,
        title,
        fileName,
        storagePath,
        storageBucket,
        allowDownload,
        isActive: true,
      },
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('[Repository Upload Complete] Error:', error)
    const err: any = error
    const code = err?.code ? String(err.code) : undefined
    const name = err?.name ? String(err.name) : undefined
    const message = err?.message ? String(err.message) : undefined

    return NextResponse.json(
      {
        error: 'Error registrando documento',
        details: {
          code,
          name,
          message: message ? message.slice(0, 300) : undefined,
        },
      },
      { status: 500 }
    )
  }
}
