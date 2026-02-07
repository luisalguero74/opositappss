import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeParseOptions } from '@/lib/answer-normalization'

type DeleteBrokenRequest = {
  dryRun?: boolean
  limit?: number
  batchSize?: number
  includeCorrupt?: boolean
  ids?: string[]
}

function isAdminSession(session: any): boolean {
  return Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
}

function isOptionsLiterallyEmpty(raw: string): boolean {
  const v = raw.trim()
  return v === '' || v === '[]'
}

async function runDelete(params: {
  dryRun: boolean
  limit: number
  batchSize: number
  includeCorrupt: boolean
  ids?: string[]
}) {
  const { dryRun, limit, batchSize, includeCorrupt, ids } = params

  const startedAt = Date.now()

  let scanned = 0
  let eligible = 0
  let deleted = 0
  let wouldDelete = 0
  let skipped = 0

  const deletionsSample: Array<{
    id: string
    questionnaireId: string
    reason: string
    questionTextPreview: string
    optionsRawPreview: string
  }> = []

  const idsFilter = Array.isArray(ids) && ids.length > 0 ? ids : null
  let lastId: string | undefined
  let idsCursor = 0

  while (scanned < limit) {
    const remaining = limit - scanned
    const take = Math.min(batchSize, remaining)

    const batch = idsFilter
      ? await prisma.question.findMany({
          where: { id: { in: idsFilter.slice(idsCursor, idsCursor + take) } },
          select: { id: true, questionnaireId: true, text: true, options: true },
          orderBy: { id: 'asc' }
        })
      : await prisma.question.findMany({
          ...(lastId ? { where: { id: { gt: lastId } } } : {}),
          select: {
            id: true,
            questionnaireId: true,
            text: true,
            options: true
          },
          orderBy: { id: 'asc' },
          take
        })

    if (batch.length === 0) break

    scanned += batch.length
    if (idsFilter) {
      idsCursor += take
      if (idsCursor >= idsFilter.length) {
        // processed all provided ids
        lastId = undefined
      }
    } else {
      lastId = batch[batch.length - 1]?.id
    }

    const idsToDelete: string[] = []

    for (const q of batch) {
      eligible++
      const raw = String((q as any).options ?? '').trim()

      let reason: string | null = null
      if (isOptionsLiterallyEmpty(raw)) {
        reason = 'Opciones vacías (options es "[]" o string vacío)'
      } else if (includeCorrupt) {
        const parsed = safeParseOptions(raw)
        if (parsed.length !== 4) {
          reason = `Opciones corruptas/no parseables a 4 opciones (parsed=${parsed.length})`
        }
      }

      if (!reason) {
        skipped++
        continue
      }

      if (dryRun) {
        wouldDelete++
      } else {
        idsToDelete.push(q.id)
      }

      if (deletionsSample.length < 50) {
        deletionsSample.push({
          id: q.id,
          questionnaireId: String((q as any).questionnaireId ?? ''),
          reason,
          questionTextPreview: String((q as any).text ?? '').slice(0, 160),
          optionsRawPreview: raw.slice(0, 800)
        })
      }
    }

    if (!dryRun && idsToDelete.length > 0) {
      // Chunk deletes to keep queries reasonable
      for (let i = 0; i < idsToDelete.length; i += 200) {
        const chunk = idsToDelete.slice(i, i + 200)
        const res = await prisma.question.deleteMany({
          where: { id: { in: chunk } }
        })
        deleted += res.count
      }
    }

    if (idsFilter && idsCursor >= idsFilter.length) break
  }

  const ms = Date.now() - startedAt

  return {
    ok: true,
    dryRun,
    limit,
    batchSize,
    includeCorrupt,
    scanned,
    eligible,
    deleted,
    wouldDelete,
    skipped,
    deletionsSample,
    durationMs: ms
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRunParam = url.searchParams.get('dryRun')
  const applyParam = url.searchParams.get('apply')
  const limitParam = url.searchParams.get('limit')
  const batchSizeParam = url.searchParams.get('batchSize')
  const includeCorruptParam = url.searchParams.get('includeCorrupt')
  const idsParam = url.searchParams.get('ids')

  const dryRun = applyParam === '1' || applyParam === 'true'
    ? false
    : dryRunParam === null
      ? true
      : !(dryRunParam === '0' || dryRunParam === 'false')

  const limit = limitParam ? Math.max(0, Number(limitParam)) : 50_000
  const batchSize = batchSizeParam ? Math.min(500, Math.max(10, Number(batchSizeParam))) : 200
  const includeCorrupt = includeCorruptParam === '1' || includeCorruptParam === 'true'
  const ids = idsParam
    ? idsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined

  const result = await runDelete({ dryRun, limit, batchSize, includeCorrupt, ids })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: DeleteBrokenRequest = {}
  try {
    body = (await req.json()) || {}
  } catch {
    body = {}
  }

  const dryRun = body.dryRun !== undefined ? Boolean(body.dryRun) : true
  const limit = Number.isFinite(body.limit as any) ? Math.max(0, Number(body.limit)) : 50_000
  const batchSize = Number.isFinite(body.batchSize as any) ? Math.min(500, Math.max(10, Number(body.batchSize))) : 200
  const includeCorrupt = Boolean(body.includeCorrupt)
  const ids = Array.isArray(body.ids)
    ? body.ids.map((s) => String(s).trim()).filter(Boolean)
    : undefined

  const result = await runDelete({ dryRun, limit, batchSize, includeCorrupt, ids })
  return NextResponse.json(result)
}
