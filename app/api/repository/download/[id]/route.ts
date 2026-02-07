import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logRepoDocumentAccess } from '@/lib/repository'
import { createClient } from '@supabase/supabase-js'
import { reportForbiddenRepositoryAction } from '@/lib/repository-security'
import {
  getB2RepositoryS3ConfigFromEnv,
  presignB2GetObjectUrl,
  proxyRemoteFile,
} from '@/lib/external-file'

export const runtime = 'nodejs'

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key)
}

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

    const role = String(session.user.role || '').toLowerCase()
    const isAdmin = role === 'admin'
    const repoRole = String(session.user.repoRole || 'NONE').toUpperCase()
    const preview = req.nextUrl.searchParams.get('preview') === '1'

    const canAccessRepository = isAdmin || repoRole !== 'NONE'
    const canDownload = isAdmin || repoRole === 'EDITOR'

    if (!canAccessRepository) {
      await reportForbiddenRepositoryAction({
        req,
        session,
        attemptedAction: 'download',
        reason: 'no-repo-access',
        statusCode: 403,
        details: { documentId: id, preview },
      })
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Preview (ver) permitido para READER/EDITOR/admin.
    // Descarga limitada a EDITOR/admin y solo si el documento lo permite.
    if (!preview) {
      if (!document.allowDownload) {
        return NextResponse.json({ error: 'Descarga no permitida para este documento' }, { status: 403 })
      }
      if (!canDownload) {
        await reportForbiddenRepositoryAction({
          req,
          session,
          attemptedAction: 'download',
          reason: 'requires-editor-or-admin',
          statusCode: 403,
          details: { documentId: id, allowDownload: document.allowDownload },
        })
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    if (!document.storagePath) {
      return NextResponse.json({ error: 'Documento sin ruta de almacenamiento configurada' }, { status: 500 })
    }

    const storageBucket = document.storageBucket || 'repositorio-documentos'

    // Si el documento está en el bucket de Supabase, firmar desde Supabase.
    if (storageBucket === 'repositorio-documentos') {
      const supabase = getSupabaseAdminClient()
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(
          document.storagePath,
          600,
          preview
            ? undefined
            : {
                download: document.fileName || true,
              }
        )

      if (error || !data?.signedUrl) {
        return NextResponse.json({ error: 'Error al generar enlace de descarga' }, { status: 500 })
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await logRepoDocumentAccess({
        documentId: document.id,
        userId: session.user.id,
        action: preview ? 'view' : 'download',
        ipAddress: ip,
        userAgent,
      })

      // If we redirect to Supabase, the browser will render cross-origin and the app
      // can't reliably overlay a watermark due to CSP and embedding rules.
      // For preview, proxy through our domain so the viewer page can iframe it.
      if (preview) {
        // In practice, redirect is the most reliable approach for inline PDF viewing
        // and avoids server-side proxy issues (timeouts/range requests/etc.).
        return NextResponse.redirect(data.signedUrl)
      }

      return NextResponse.redirect(data.signedUrl)
    }

    // Caso B2 repositorio (bucket dedicado)
    const b2Cfg = getB2RepositoryS3ConfigFromEnv()
    if (b2Cfg && storageBucket === b2Cfg.bucket) {
      const signedUrl = await presignB2GetObjectUrl(b2Cfg, document.storagePath, preview ? 900 : 60)

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await logRepoDocumentAccess({
        documentId: document.id,
        userId: session.user.id,
        action: preview ? 'view' : 'download',
        ipAddress: ip,
        userAgent,
      })

      // Preview inside the viewer uses an iframe; redirecting to the signed URL is the
      // most reliable way to let the browser handle PDF range requests directly.
      if (preview) {
        return NextResponse.redirect(signedUrl)
      }

      return await proxyRemoteFile({
        url: signedUrl,
        fileName: document.fileName,
        disposition: 'attachment',
        range: req.headers.get('range'),
      })
    }

    return NextResponse.json(
      { error: 'Almacenamiento no soportado o no configurado para este documento' },
      { status: 500 }
    )
  } catch (error) {
    console.error('[Repository Download] Error:', error)
    return NextResponse.json({ error: 'Error al generar enlace de descarga' }, { status: 500 })
  }
}
