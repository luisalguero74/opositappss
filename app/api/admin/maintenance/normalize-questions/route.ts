import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCorrectAnswerToUpperLetter, safeParseOptions } from '@/lib/answer-normalization'

type NormalizeRequest = {
  dryRun?: boolean
  limit?: number
  batchSize?: number
}

function isAdminSession(session: any): boolean {
  return Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
}

async function runNormalization(params: { dryRun: boolean; limit: number; batchSize: number }) {
  const { dryRun, limit, batchSize } = params

  const startedAt = Date.now()

  let scanned = 0
  let eligible = 0
  let updated = 0
  let wouldUpdate = 0
  let unchanged = 0
  let failed = 0

  const failures: Array<{
    id: string
    questionnaireId: string
    reason: string
    correctAnswer: string
    optionsCount: number
    questionTextPreview: string
    optionsRawPreview: string
    optionsRawLength: number
  }> = []
  const updatesSample: Array<{ id: string; from: string; to: string }> = []

  let lastId: string | undefined

  while (scanned < limit) {
    const remaining = limit - scanned
    const take = Math.min(batchSize, remaining)

    const where = {
      OR: [
        { correctAnswer: { in: ['a', 'b', 'c', 'd'] } },
        { correctAnswer: { notIn: ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'] } }
      ],
      ...(lastId ? { id: { gt: lastId } } : {})
    } as any

    const batch = await prisma.question.findMany({
      where,
      select: { id: true, questionnaireId: true, text: true, correctAnswer: true, options: true },
      orderBy: { id: 'asc' },
      take
    })

    if (batch.length === 0) break

    scanned += batch.length
    lastId = batch[batch.length - 1]?.id

    const updateOps: Array<ReturnType<typeof prisma.question.update>> = []

    for (const q of batch) {
      eligible++
      const options = safeParseOptions(q.options).map((o) => String(o ?? '').trim())
      const normalized = normalizeCorrectAnswerToUpperLetter(q.correctAnswer, options)

      if (!normalized) {
        failed++
        if (failures.length < 50) {
          const optionsRaw = String((q as any).options ?? '')
          failures.push({
            id: q.id,
            questionnaireId: String((q as any).questionnaireId ?? ''),
            reason: 'No se puede normalizar (no coincide con A-D, índice 0-3/1-4, ni texto exacto de una opción)',
            correctAnswer: String(q.correctAnswer ?? ''),
            optionsCount: options.length,
            questionTextPreview: String((q as any).text ?? '').slice(0, 160),
            optionsRawPreview: optionsRaw.slice(0, 800),
            optionsRawLength: optionsRaw.length
          })
        }
        continue
      }

      const from = String(q.correctAnswer ?? '').trim()
      const to = normalized

      if (from.toUpperCase() === to && ['A', 'B', 'C', 'D'].includes(from.toUpperCase())) {
        unchanged++
        continue
      }

      if (from !== to) {
        if (dryRun) {
          wouldUpdate++
        } else {
          updateOps.push(
            prisma.question.update({
              where: { id: q.id },
              data: { correctAnswer: to }
            })
          )
          updated++
        }

        if (updatesSample.length < 30) {
          updatesSample.push({ id: q.id, from, to })
        }
      } else {
        unchanged++
      }
    }

    if (!dryRun && updateOps.length > 0) {
      for (let i = 0; i < updateOps.length; i += 50) {
        await prisma.$transaction(updateOps.slice(i, i + 50))
      }
    }
  }

  const ms = Date.now() - startedAt

  return {
    ok: true,
    dryRun,
    limit,
    batchSize,
    scanned,
    eligible,
    updated,
    wouldUpdate,
    unchanged,
    failed,
    failures,
    updatesSample,
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

  const dryRun = applyParam === '1' || applyParam === 'true'
    ? false
    : dryRunParam === null
      ? true
      : !(dryRunParam === '0' || dryRunParam === 'false')

  const limit = limitParam ? Math.max(0, Number(limitParam)) : 50_000
  const batchSize = batchSizeParam ? Math.min(500, Math.max(10, Number(batchSizeParam))) : 200

  const result = await runNormalization({ dryRun, limit, batchSize })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: NormalizeRequest = {}
  try {
    body = (await req.json()) || {}
  } catch {
    body = {}
  }

  const dryRun = body.dryRun !== undefined ? Boolean(body.dryRun) : true
  const limit = Number.isFinite(body.limit as any) ? Math.max(0, Number(body.limit)) : 50_000
  const batchSize = Number.isFinite(body.batchSize as any) ? Math.min(500, Math.max(10, Number(body.batchSize))) : 200

  const result = await runNormalization({ dryRun, limit, batchSize })
  return NextResponse.json(result)
}
