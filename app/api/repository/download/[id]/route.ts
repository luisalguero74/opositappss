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
import { addPdfWatermark } from '@/lib/pdf-watermark'
import { formatWatermarkTimestampUtc, normalizeSpanishPhoneForDisplay } from '@/lib/phone-normalization'

export const runtime = 'nodejs'

async function downloadSupabaseBytes(params: { bucket: string; path: string }): Promise<Uint8Array> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.storage.from(params.bucket).download(params.path)
  if (error || !data) {
    throw new Error(`Supabase download failed: ${error?.message || 'no data'}`)
  }
  const buffer = Buffer.from(await data.arrayBuffer())
  return new Uint8Array(buffer)
}

async function downloadRemoteBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Remote fetch failed: ${res.status}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  return new Uint8Array(buffer)
}

function safeContentDispositionFileName(name: string): string {
  const base = String(name || '').trim() || 'documento.pdf'
  // Keep it simple: encode and avoid newlines.
  return encodeURIComponent(base.replace(/[\r\n]/g, ''))
}

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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    const desiredDisposition: 'inline' | 'attachment' = preview ? 'inline' : 'attachment'
    const resolvedFileName = safeContentDispositionFileName(document.fileName || 'documento.pdf')

    // For non-admin users, never redirect to signed URLs: it enables bypass of watermarking.
    // Instead, fetch bytes server-side, stamp watermark (user+timestamp), and return the PDF.
    const shouldWatermark = !isAdmin
    const watermarkText = shouldWatermark
      ? (() => {
          const base = 'OPOSITAPP · solo para uso formativo · NO DISTRIBUIR'
          return base
        })()
      : ''

    const watermarkUser = shouldWatermark
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true, phoneNumber: true },
        })
      : null

    const watermarkEmail = shouldWatermark ? String(watermarkUser?.email || session.user.email || '—') : ''
    const normalizedPhone = shouldWatermark ? normalizeSpanishPhoneForDisplay(watermarkUser?.phoneNumber) : ''
    const watermarkPhone = shouldWatermark ? (normalizedPhone ? normalizedPhone : '—') : ''
    const watermarkTimestamp = shouldWatermark ? formatWatermarkTimestampUtc(new Date()) : ''
    const finalWatermarkText = shouldWatermark
      ? `${watermarkText} · ${watermarkEmail} · ${watermarkPhone} · ${watermarkTimestamp}`
      : ''

    // Si el documento está en el bucket de Supabase.
    if (storageBucket === 'repositorio-documentos') {
      await logRepoDocumentAccess({
        documentId: document.id,
        userId: session.user.id,
        action: preview ? 'view' : 'download',
        ipAddress: ip,
        userAgent,
      })

      if (!shouldWatermark) {
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

        return NextResponse.redirect(data.signedUrl)
      }

      const originalBytes = await downloadSupabaseBytes({ bucket: storageBucket, path: document.storagePath })
      const stamped = await addPdfWatermark(originalBytes, {
        text: finalWatermarkText,
        opacity: 0.14,
        fontSize: 42,
        rotationDegrees: -28,
        tileStep: 320,
      })

      return new NextResponse(Buffer.from(stamped), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${desiredDisposition}; filename="${resolvedFileName}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    // Caso B2 repositorio (bucket dedicado)
    const b2Cfg = getB2RepositoryS3ConfigFromEnv()
    if (b2Cfg && storageBucket === b2Cfg.bucket) {
      const signedUrl = await presignB2GetObjectUrl(b2Cfg, document.storagePath, preview ? 900 : 60)

      await logRepoDocumentAccess({
        documentId: document.id,
        userId: session.user.id,
        action: preview ? 'view' : 'download',
        ipAddress: ip,
        userAgent,
      })

      if (!shouldWatermark) {
        // Keep existing, range-friendly behavior for admins.
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

      const originalBytes = await downloadRemoteBytes(signedUrl)
      const stamped = await addPdfWatermark(originalBytes, {
        text: finalWatermarkText,
        opacity: 0.14,
        fontSize: 42,
        rotationDegrees: -28,
        tileStep: 320,
      })

      return new NextResponse(Buffer.from(stamped), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${desiredDisposition}; filename="${resolvedFileName}"`,
          'Cache-Control': 'private, no-store',
        },
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
