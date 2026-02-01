import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { getB2RepositoryS3ConfigFromEnv, putB2Object } from '@/lib/external-file'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    const repoRole = String(session?.user?.repoRole || '').toUpperCase()
    const canEdit = role === 'admin' || repoRole === 'EDITOR'
    if (!session?.user || !canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const folderKey = formData.get('folderId') as string
    const allowDownload = formData.get('allowDownload') === 'true'

    if (!file || !title || !folderKey) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Accept both RepoFolder.id (cuid) and RepoFolder.code (stable string like "temario-adams").
    const existingById = await prisma.repoFolder.findUnique({
      where: { id: folderKey },
      select: { id: true },
    })
    const folder = existingById
      ? { id: existingById.id }
      : await prisma.repoFolder.upsert({
          where: { code: folderKey },
          update: { name: folderKey },
          create: { code: folderKey, name: folderKey },
          select: { id: true },
        })

    const storagePath = `repo/${folderKey}/${Date.now()}_${file.name}`
    const b2Cfg = getB2RepositoryS3ConfigFromEnv()
    let storageBucket = 'repositorio-documentos'

    if (b2Cfg) {
      // Subir a Backblaze B2 (S3-compatible)
      const body = Readable.fromWeb(file.stream() as any)
      await putB2Object(b2Cfg, {
        key: storagePath,
        body,
        contentType: file.type || undefined,
      })
      storageBucket = b2Cfg.bucket
    } else {
      // Fallback: Subir a Supabase Storage
      const supabase = getSupabaseAdminClient()
      const { error: uploadError } = await supabase.storage
        .from('repositorio-documentos')
        .upload(storagePath, file.stream(), { contentType: file.type })
      if (uploadError) {
        return NextResponse.json({ error: 'Error al subir fichero: ' + uploadError.message }, { status: 500 })
      }
    }

    // Registrar en BD
    const document = await prisma.repoDocument.create({
      data: {
        folderId: folder.id,
        title,
        fileName: file.name,
        storagePath,
        storageBucket,
        allowDownload,
        isActive: true,
      },
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('[Repository Upload] Error:', error)
    return NextResponse.json({ error: 'Error al subir fichero' }, { status: 500 })
  }
}
