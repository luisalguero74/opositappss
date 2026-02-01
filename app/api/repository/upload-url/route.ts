import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getB2RepositoryS3ConfigFromEnv, presignB2PutObjectUrl } from '@/lib/external-file'

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
    const folderId = String(body?.folderId || '')
    const fileName = String(body?.fileName || '')
    const contentType = String(body?.contentType || '')

    if (!folderId || !fileName) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 })
    }

    const b2Cfg = getB2RepositoryS3ConfigFromEnv()
    if (!b2Cfg) {
      return NextResponse.json(
        { error: 'Repositorio B2 no configurado para subida directa' },
        { status: 501 }
      )
    }

    const storagePath = `repo/${folderId}/${Date.now()}_${fileName}`
    const expiresInSeconds = 15 * 60
    const uploadUrl = await presignB2PutObjectUrl(b2Cfg, storagePath, {
      contentType: contentType || undefined,
      expiresInSeconds,
    })

    return NextResponse.json({
      uploadUrl,
      storagePath,
      storageBucket: b2Cfg.bucket,
      expiresInSeconds,
    })
  } catch (error) {
    console.error('[Repository Upload URL] Error:', error)
    return NextResponse.json({ error: 'Error generando URL de subida' }, { status: 500 })
  }
}
