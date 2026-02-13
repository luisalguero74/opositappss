import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function ensureCronHeartbeatTableExists() {
  // Idempotent, constant SQL only (no user input).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cron_run_heartbeat (
      id BIGSERIAL PRIMARY KEY,
      job TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      themes_processed INTEGER NOT NULL DEFAULT 0,
      details TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS cron_run_heartbeat_job_created_at_idx
      ON cron_run_heartbeat (job, created_at DESC);
  `)
}

function asInt(value: string | null | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export async function GET(req: NextRequest) {
  try {
    // Auth: allow x-api-key (ADMIN_API_KEY) or admin session
    const apiKey = req.headers.get('x-api-key')
    const validApiKey = process.env.ADMIN_API_KEY

    if (apiKey && validApiKey && apiKey === validApiKey) {
      // ok
    } else {
      const session = await getServerSession(authOptions)
      const role = String(session?.user?.role || '').toUpperCase()
      if (!session || role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(req.url)
    const hours = asInt(searchParams.get('hours'), 24)
    const titleContains = searchParams.get('titleContains') || 'Cron'
    const job = searchParams.get('job') || 'generate-questions'

    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)

    const cronQuestionnaires = await prisma.questionnaire.findMany({
      where: {
        createdAt: { gte: start },
        title: { contains: titleContains, mode: 'insensitive' }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        published: true,
        _count: { select: { questions: true } }
      }
    })

    const cronQuestionnaireIds = cronQuestionnaires.map(q => q.id)

    const cronQuestions = cronQuestionnaireIds.length
      ? await prisma.question.count({ where: { questionnaireId: { in: cronQuestionnaireIds } } })
      : 0

    const latest = cronQuestionnaires[0]

    // Heartbeat: last cron execution, even if it generated 0 or used a different title.
    let lastRun: null | {
      createdAt: string
      success: boolean
      totalQuestions: number
      themesProcessed: number
      error: string | null
      details: any
    } = null

    try {
      await ensureCronHeartbeatTableExists()
      const rows = await prisma.$queryRaw<
        Array<{
          created_at: Date
          success: boolean
          total_questions: number
          themes_processed: number
          error: string | null
          details: string | null
        }>
      >`
        SELECT created_at, success, total_questions, themes_processed, error, details
        FROM cron_run_heartbeat
        WHERE job = ${job}
        ORDER BY created_at DESC
        LIMIT 1
      `

      const r = rows?.[0]
      if (r) {
        let parsed: any = null
        try {
          parsed = r.details ? JSON.parse(r.details) : null
        } catch {
          parsed = r.details
        }

        lastRun = {
          createdAt: r.created_at.toISOString(),
          success: !!r.success,
          totalQuestions: Number(r.total_questions ?? 0),
          themesProcessed: Number(r.themes_processed ?? 0),
          error: r.error ?? null,
          details: parsed
        }
      }
    } catch (e) {
      console.warn('[Cron Status] Heartbeat read failed; continuing:', e)
    }

    // Fallback (no DDL needed): use SystemError log entries.
    if (!lastRun) {
      try {
        const last = await prisma.systemError.findFirst({
          where: { errorType: 'CRON_RUN' },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, statusCode: true, message: true, context: true }
        })

        if (last) {
          let parsed: any = null
          try {
            parsed = last.context ? JSON.parse(last.context) : null
          } catch {
            parsed = last.context
          }

          lastRun = {
            createdAt: last.createdAt.toISOString(),
            success: Number(last.statusCode ?? 0) >= 200 && Number(last.statusCode ?? 0) < 300,
            totalQuestions: Number(parsed?.totalQuestions ?? 0),
            themesProcessed: Number(parsed?.themesProcessed ?? 0),
            error: parsed?.error ?? null,
            details: parsed?.details ?? parsed
          }
        }
      } catch (e) {
        console.warn('[Cron Status] SystemError fallback heartbeat read failed; continuing:', e)
      }
    }

    // Current state: how many temas are still below the cron threshold.
    // This helps distinguish "cron ran but had nothing to do" vs "cron didn't run".
    const grouped = await prisma.question.groupBy({
      by: ['temaCodigo'],
      _count: true
    })

    const counts = grouped
      .map(g => ({ temaCodigo: g.temaCodigo, count: (g as any)._count }))
      .filter(x => x.temaCodigo)
      .map(x => ({ temaCodigo: String(x.temaCodigo), count: Number(x.count ?? 0) }))

    const numericCounts = counts.map(c => c.count)
    const temasUnder100 = counts.filter(c => c.count < 100).length
    const temasAtOrAbove100 = counts.filter(c => c.count >= 100).length

    return NextResponse.json({
      success: true,
      window: { start: start.toISOString(), now: now.toISOString(), hours },
      filter: { titleContains },
      heartbeat: { job, lastRun },
      cronQuestionnaires: cronQuestionnaires.length,
      cronQuestions,
      latest: latest
        ? {
            id: latest.id,
            title: latest.title,
            createdAt: latest.createdAt,
            published: latest.published,
            questions: latest._count.questions
          }
        : null,
      temaStats: {
        distinctTemaCodigo: counts.length,
        temasUnder100,
        temasAtOrAbove100,
        min: numericCounts.length ? Math.min(...numericCounts) : null,
        max: numericCounts.length ? Math.max(...numericCounts) : null
      },
      items: cronQuestionnaires.slice(0, 20).map(q => ({
        id: q.id,
        title: q.title,
        createdAt: q.createdAt,
        published: q.published,
        questions: q._count.questions
      }))
    })
  } catch (error: any) {
    console.error('[Cron Status] Error:', error)
    return NextResponse.json(
      {
        error: 'Error consultando estado del cron',
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
