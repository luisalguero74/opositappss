import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCronJobsTable,
  enqueueJob,
  getActiveJobByType,
  updateJob,
  type CronJobPayload,
  type CronJobType
} from '../../_db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_JOBS: CronJobType[] = ['general', 'especifico', 'all']

type Categoria = 'general' | 'especifico'

function resolveEffectiveJob(job: CronJobType, now: Date): CronJobType | null {
  if (job === 'general') return 'general'
  if (job === 'especifico') {
    // Same as localhost schedule: Mondays
    return now.getDay() === 1 ? 'especifico' : null
  }
  if (job === 'all') {
    // Under Vercel 2-cron limit, /run/all is used as a consolidated runner:
    // - Day 1 of month: run monthly ("all")
    // - Mondays: run weekly ("especifico")
    if (now.getDate() === 1) return 'all'
    if (now.getDay() === 1) return 'especifico'
    return null
  }
  return null
}

function getInitialPhase(job: CronJobType): Categoria {
  return job === 'especifico' ? 'especifico' : 'general'
}

function getNextPhase(payload: CronJobPayload): Categoria | null {
  if (payload.job !== 'all') return null
  if (payload.phase === 'general') return 'especifico'
  return null
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ job: string }> }
) {
  try {
    const params = await context.params
    const job = params.job as CronJobType

    if (!VALID_JOBS.includes(job)) {
      return NextResponse.json({ error: 'Job inválido' }, { status: 400 })
    }

    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()
    const effectiveJob = resolveEffectiveJob(job, now)
    if (process.env.NODE_ENV === 'production' && !effectiveJob) {
      return NextResponse.json({ message: 'No corresponde ejecutar hoy', job })
    }

    await ensureCronJobsTable()

    // Match localhost cron script defaults
    const preguntasPorTema = 30

    const jobToRun = effectiveJob ?? job

    let active = await getActiveJobByType(jobToRun)
    if (!active) {
      await enqueueJob(jobToRun, preguntasPorTema)
      active = await getActiveJobByType(jobToRun)
    }

    if (!active) {
      return NextResponse.json({ error: 'No se pudo crear job' }, { status: 500 })
    }

    const origin = new URL(req.url).origin

    let payload: CronJobPayload = active.payload || {
      job: jobToRun,
      preguntasPorTema
    }

    if (!payload.phase) {
      payload.phase = getInitialPhase(job)
    }
    if (typeof payload.temaIndex !== 'number') payload.temaIndex = 0
    if (typeof payload.preguntasPorTema !== 'number') payload.preguntasPorTema = preguntasPorTema

    const started = Date.now()
    const budgetMs = 250_000
    const maxSteps = 40

    // Start/ensure questionnaire for current phase
    const ensureStarted = async () => {
      if (payload.questionnaireId && typeof payload.temasTotal === 'number') return

      const startRes = await fetch(`${origin}/api/admin/generate-bulk-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-cron': '1'
        },
        body: JSON.stringify({
          action: 'start',
          categoria: payload.phase,
          preguntasPorTema: payload.preguntasPorTema,
          questionnaireId: payload.questionnaireId
        })
      })

      const startData = await startRes.json().catch(() => null)
      if (!startRes.ok || !startData?.questionnaireId) {
        payload.lastError =
          startData?.details || startData?.error || `start failed status=${startRes.status}`
        await updateJob(active!.id, 'failed', payload)
        throw new Error(payload.lastError)
      }

      payload.questionnaireId = startData.questionnaireId
      payload.temasTotal = Number(startData.temasTotal ?? 0)
      payload.temaIndex = payload.temaIndex ?? 0
      payload.lastMessage = 'Iniciado'
      await updateJob(active!.id, 'running', payload)
    }

    await ensureStarted()

    let steps = 0
    let temasCompletadosEnEstaEjecucion = 0
    let chunksOk = 0

    while (Date.now() - started < budgetMs && steps < maxSteps) {
      steps += 1

      if (!payload.questionnaireId || typeof payload.temasTotal !== 'number') break

      if ((payload.temaIndex ?? 0) >= payload.temasTotal) {
        const next = getNextPhase(payload)
        if (next) {
          payload.phase = next
          payload.temaIndex = 0
          payload.temasTotal = undefined
          payload.lastMessage = 'Cambiando fase'
          await updateJob(active.id, 'running', payload)
          await ensureStarted()
          continue
        }

        payload.lastMessage = 'Completado'
        await updateJob(active.id, 'done', payload)
        return NextResponse.json({ message: 'Job completado', job, payload })
      }

      const chunkRes = await fetch(`${origin}/api/admin/generate-bulk-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-cron': '1'
        },
        body: JSON.stringify({
          action: 'chunk',
          categoria: payload.phase,
          preguntasPorTema: payload.preguntasPorTema,
          questionnaireId: payload.questionnaireId,
          temaIndex: payload.temaIndex,
          preguntasChunkSize: 5
        })
      })

      const chunkData = await chunkRes.json().catch(() => null)
      if (!chunkRes.ok) {
        payload.lastError =
          chunkData?.details || chunkData?.error || `chunk failed status=${chunkRes.status}`
        await updateJob(active.id, 'failed', payload)
        return NextResponse.json({ error: 'Cron chunk falló', details: payload.lastError }, { status: 500 })
      }

      chunksOk += 1

      // Avoid infinite loops on themes with only duplicates
      const inserted = Number(chunkData?.inserted ?? 0)
      const doneForTema = Boolean(chunkData?.doneForTema)
      if (doneForTema) {
        payload.temaIndex = (payload.temaIndex ?? 0) + 1
        temasCompletadosEnEstaEjecucion += 1
        payload.lastMessage = `Tema completado (${payload.phase})`
      } else if (!Number.isFinite(inserted) || inserted <= 0) {
        // If no progress, skip to next theme to keep cron moving
        payload.temaIndex = (payload.temaIndex ?? 0) + 1
        temasCompletadosEnEstaEjecucion += 1
        payload.lastMessage = `Tema saltado por 0 progreso (${payload.phase})`
      } else {
        payload.lastMessage = `Chunk ok (${payload.phase})`
      }

      await updateJob(active.id, 'running', payload)
    }

    return NextResponse.json({
      message: 'Cron run parcial (limitado por tiempo)',
      job,
      phase: payload.phase,
      questionnaireId: payload.questionnaireId,
      temaIndex: payload.temaIndex,
      temasTotal: payload.temasTotal,
      steps,
      chunksOk,
      temasCompletadosEnEstaEjecucion
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Error en cron run', details: message },
      { status: 500 }
    )
  }
}
