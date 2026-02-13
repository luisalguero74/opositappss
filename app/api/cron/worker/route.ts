import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCronJobsTable,
  findActiveJob,
  updateJob,
  type CronJobPayload
} from '../_db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Categoria = 'general' | 'especifico'

function getInitialPhase(job: string): Categoria {
  return job === 'especifico' ? 'especifico' : 'general'
}

function getNextPhase(payload: CronJobPayload): Categoria | null {
  if (payload.job !== 'all') return null
  if (payload.phase === 'general') return 'especifico'
  return null
}

export async function GET(req: NextRequest) {
  try {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    if (process.env.NODE_ENV === 'production' && !isVercelCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await ensureCronJobsTable()

    const active = await findActiveJob()
    if (!active) {
      return NextResponse.json({ message: 'Sin jobs activos' })
    }

    const origin = new URL(req.url).origin

    let payload: CronJobPayload = active.payload || {
      job: active.job,
      preguntasPorTema: 30
    }

    const started = Date.now()
    const budgetMs = 240_000
    const maxSteps = 40

    // Ensure running state has a phase
    if (!payload.phase) {
      payload.phase = getInitialPhase(payload.job)
    }
    if (typeof payload.temaIndex !== 'number') payload.temaIndex = 0

    // If we don't have a questionnaire, create/start via the existing generator endpoint
    if (!payload.questionnaireId || typeof payload.temasTotal !== 'number') {
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
        await updateJob(active.id, 'failed', payload)
        return NextResponse.json({ error: 'Cron start falló', details: payload.lastError }, { status: 500 })
      }

      payload.questionnaireId = startData.questionnaireId
      payload.temasTotal = Number(startData.temasTotal ?? 0)
      payload.temaIndex = 0
      payload.lastMessage = 'Iniciado'

      await updateJob(active.id, 'running', payload)
    }

    // Process chunk steps until time budget runs out
    let steps = 0
    while (Date.now() - started < budgetMs && steps < maxSteps) {
      steps += 1

      if (!payload.questionnaireId || typeof payload.temasTotal !== 'number') {
        break
      }

      // If phase is finished, advance phase or finish job
      if ((payload.temaIndex ?? 0) >= payload.temasTotal) {
        const next = getNextPhase(payload)
        if (next) {
          payload.phase = next
          payload.temaIndex = 0
          payload.temasTotal = undefined
          payload.lastMessage = 'Cambiando fase'
          await updateJob(active.id, 'running', payload)
          continue
        }

        payload.lastMessage = 'Completado'
        await updateJob(active.id, 'done', payload)
        return NextResponse.json({ message: 'Job completado', job: payload.job, payload })
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

      // If we learned temasTotal now (e.g. after phase switch)
      if (typeof chunkData?.temasTotal === 'number') {
        payload.temasTotal = Number(chunkData.temasTotal)
      }

      if (chunkData?.doneForTema) {
        payload.temaIndex = (payload.temaIndex ?? 0) + 1
        payload.lastMessage = `Tema completado (${payload.phase})`
      } else {
        payload.lastMessage = `Chunk ok (${payload.phase})`
      }

      await updateJob(active.id, 'running', payload)
    }

    return NextResponse.json({
      message: 'Worker tick completado',
      job: payload.job,
      phase: payload.phase,
      temaIndex: payload.temaIndex,
      temasTotal: payload.temasTotal,
      questionnaireId: payload.questionnaireId,
      steps
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Error en cron worker', details: message },
      { status: 500 }
    )
  }
}
