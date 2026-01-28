import { prisma } from '../src/lib/prisma'

async function main() {
  try {
    const rows = await prisma.$queryRawUnsafe<{
      id: number
      job: string
      success: boolean
      total_questions: number
      themes_processed: number
      details: string | null
      error: string | null
      created_at: Date
    }[]>(
      `SELECT id, job, success, total_questions, themes_processed, details, error, created_at
       FROM cron_run_heartbeat
       ORDER BY created_at DESC
       LIMIT 20`
    )

    if (!rows.length) {
      console.log('No hay registros en cron_run_heartbeat')
    } else {
      console.log('Últimos registros de cron_run_heartbeat:')
      for (const r of rows) {
        console.log(
          `#${r.id} | ${r.created_at.toISOString()} | job=${r.job} | success=${r.success} | total=${r.total_questions} | temas=${r.themes_processed} | error=${r.error ?? 'OK'}`
        )
      }
    }
  } catch (err) {
    console.error('Error consultando cron_run_heartbeat:', err)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main().catch((e) => {
  console.error('Fallo en check-cron-heartbeat:', e)
})
