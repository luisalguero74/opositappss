import { prisma } from '@/lib/prisma'

export type CronJobType = 'general' | 'especifico' | 'all'
export type CronJobStatus = 'pending' | 'running' | 'done' | 'failed'

export type CronJobPayload = {
  job: CronJobType
  preguntasPorTema: number
  questionnaireId?: string
  phase?: 'general' | 'especifico'
  temaIndex?: number
  temasTotal?: number
  lastMessage?: string
  lastError?: string
  updatedAt?: string
}

export async function ensureCronJobsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cron_generation_jobs (
      id BIGSERIAL PRIMARY KEY,
      job TEXT NOT NULL,
      status TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS cron_generation_jobs_status_created_at_idx ON cron_generation_jobs (status, created_at);`
  )
}

function escapeJsonForSql(value: any) {
  const json = JSON.stringify(value ?? {})
  return json.replace(/'/g, "''")
}

export async function findActiveJob(): Promise<
  | { id: number; job: CronJobType; status: CronJobStatus; payload: CronJobPayload }
  | null
> {
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, job, status, payload
     FROM cron_generation_jobs
     WHERE status IN ('pending','running')
     ORDER BY created_at ASC
     LIMIT 1`
  )) as any[]

  const row = rows?.[0]
  if (!row) return null
  return {
    id: Number(row.id),
    job: row.job as CronJobType,
    status: row.status as CronJobStatus,
    payload: (row.payload ?? {}) as CronJobPayload
  }
}

export async function hasActiveJob(job: CronJobType): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `SELECT 1
     FROM cron_generation_jobs
     WHERE job='${job.replace(/'/g, "''")}'
       AND status IN ('pending','running')
     LIMIT 1`
  )) as any[]
  return rows.length > 0
}

export async function getActiveJobByType(job: CronJobType): Promise<
  | { id: number; job: CronJobType; status: CronJobStatus; payload: CronJobPayload }
  | null
> {
  const rows = (await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, job, status, payload
     FROM cron_generation_jobs
     WHERE job='${job.replace(/'/g, "''")}'
       AND status IN ('pending','running')
     ORDER BY created_at ASC
     LIMIT 1`
  )) as any[]

  const row = rows?.[0]
  if (!row) return null
  return {
    id: Number(row.id),
    job: row.job as CronJobType,
    status: row.status as CronJobStatus,
    payload: (row.payload ?? {}) as CronJobPayload
  }
}

export async function enqueueJob(job: CronJobType, preguntasPorTema: number) {
  const payload: CronJobPayload = {
    job,
    preguntasPorTema,
    updatedAt: new Date().toISOString()
  }
  const payloadSql = escapeJsonForSql(payload)

  await prisma.$executeRawUnsafe(
    `INSERT INTO cron_generation_jobs (job, status, payload)
     VALUES ('${job.replace(/'/g, "''")}', 'pending', '${payloadSql}'::jsonb)`
  )
}

export async function updateJob(
  id: number,
  status: CronJobStatus,
  payload: CronJobPayload
) {
  const payloadSql = escapeJsonForSql({
    ...payload,
    updatedAt: new Date().toISOString()
  })

  await prisma.$executeRawUnsafe(
    `UPDATE cron_generation_jobs
     SET status='${status.replace(/'/g, "''")}',
         payload='${payloadSql}'::jsonb,
         updated_at=now()
     WHERE id=${Number(id)}`
  )
}
