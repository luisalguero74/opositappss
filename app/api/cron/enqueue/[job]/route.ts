import { NextRequest, NextResponse } from 'next/server'
import { ensureCronJobsTable, enqueueJob, hasActiveJob, type CronJobType } from '../../_db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_JOBS: CronJobType[] = ['general', 'especifico', 'all']

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ job: string }> }
) {
  try {
    const params = await context.params
    const job = params.job as CronJobType

    if (!VALID_JOBS.includes(job)) {
      return NextResponse.json({ error: 'Job inválido' }, { status: 400 })
    }

    // Only allow Vercel Cron to trigger in production
    const isVercelCron = _req.headers.get('x-vercel-cron') === '1'
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await ensureCronJobsTable()

    // Match localhost cron script defaults: 30 questions per theme
    const preguntasPorTema = 30

    if (await hasActiveJob(job)) {
      return NextResponse.json({ message: 'Ya existe un job activo', job })
    }

    await enqueueJob(job, preguntasPorTema)

    return NextResponse.json({ message: 'Job encolado', job, preguntasPorTema })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Error en enqueue cron', details: message },
      { status: 500 }
    )
  }
}
