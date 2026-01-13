import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_CONTENT_CHARS = 250_000

function truncateText(input: string, maxChars: number): string {
  if (!input) return ''
  if (input.length <= maxChars) return input
  return input.slice(0, maxChars) + `\n\n[TRUNCATED ${input.length - maxChars} chars]`
}

export async function POST(req: NextRequest) {
  let stage = 'init'
  const requestId = (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado', stage, requestId }, { status: 401 })
    }

    stage = 'parse_json'
    const body = await req.json().catch(() => null)

    const title = body?.title ? String(body.title).trim() : null
    const documentType = body?.type ? String(body.type).trim() : null
    const topic = body?.topic ? String(body.topic).trim() : null
    const reference = body?.reference ? String(body.reference).trim() : null
    const fileName = body?.fileName ? String(body.fileName).trim() : null
    const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : null
    const pageCount = typeof body?.pageCount === 'number' ? body.pageCount : null

    const contentRaw = String(body?.content ?? '')
    const content = truncateText(contentRaw, MAX_CONTENT_CHARS)

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'No se recibió contenido de texto (content)', stage, requestId },
        { status: 400 }
      )
    }

    stage = 'db_create'
    const doc = await prisma.legalDocument.create({
      data: {
        title: title || (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : 'Documento') ,
        documentType: documentType || 'ley',
        topic,
        reference: reference || title || fileName || 'Documento',
        fileName: fileName || 'upload-text.txt',
        fileSize: fileSize ?? content.length,
        metadata: JSON.stringify({
          source: 'biblioteca-legal:upload-text',
          uploadedAt: new Date().toISOString(),
          pageCount,
          contentChars: content.length,
          note: 'PDF text extracted in browser to avoid request size limits; original file not stored server-side.'
        }),
        content,
        active: true,
        processedAt: new Date()
      },
      select: { id: true }
    })

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      nombre: title || (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : 'Documento'),
      archivo: fileName || 'upload-text.txt',
      tipo: 'text',
      numeroPaginas: pageCount || 0,
      requestId
    })
  } catch (error: any) {
    console.error('[BibliotecaLegal UploadText] Error:', error)

    const details = error instanceof Error ? error.message : String(error)
    const prismaCode = typeof error?.code === 'string' ? error.code : undefined

    return NextResponse.json(
      { error: 'Error al subir texto', details, prismaCode, stage, requestId },
      { status: 500 }
    )
  }
}
