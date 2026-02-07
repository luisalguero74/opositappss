import { NextRequest, NextResponse } from 'next/server'
import { runBoeSecuritySocialMonitor } from '@/lib/boe-monitor'
import { prisma } from '@/lib/prisma'

export const maxDuration = 120 // BOE sumario is fast; keep tight.
export const dynamic = 'force-dynamic'

async function recordCronRun(input: {
  success: boolean
  publicationDateYYYYMMDD?: string
  scannedItems?: number
  matchedItems?: number
  newItems?: number
  error?: string | null
}) {
  try {
    await prisma.systemError.create({
      data: {
        errorType: 'CRON_RUN',
        severity: input.success ? 'low' : 'high',
        endpoint: '/api/cron/boe',
        statusCode: input.success ? 200 : 500,
        message: input.success
          ? `Cron BOE OK date=${input.publicationDateYYYYMMDD} newItems=${input.newItems ?? 0} matched=${input.matchedItems ?? 0}`
          : `Cron BOE ERROR: ${String(input.error || 'unknown error')}`,
        context: JSON.stringify({
          job: 'boe-ss',
          ...input
        })
      }
    })
  } catch (e) {
    console.warn('[Cron BOE] SystemError write failed; continuing:', e)
  }
}

export async function GET(req: NextRequest) {
  const normalizeSecret = (value: string | null | undefined) =>
    String(value ?? '')
      .replace(/\\n/g, '')
      .trim()

  const authHeader = req.headers.get('authorization')
  const cronSecret = normalizeSecret(process.env.CRON_SECRET)
  const vercelCronHeader = req.headers.get('x-vercel-cron')

  const isVercelCron = vercelCronHeader === '1'
  const authToken = normalizeSecret(authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '')
  const isValidManualAuth = !!cronSecret && !!authToken && authToken === cronSecret

  if (!isVercelCron && !cronSecret) {
    return NextResponse.json({ error: 'Configuración incompleta (CRON_SECRET)' }, { status: 500 })
  }

  if (!isVercelCron && !isValidManualAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const dateYYYYMMDD = req.nextUrl?.searchParams?.get('date')?.trim() || undefined

  try {
    const result = await runBoeSecuritySocialMonitor({
      dateYYYYMMDD,
      notifyAdmins: true
    })

    await recordCronRun({
      success: true,
      publicationDateYYYYMMDD: result.publicationDateYYYYMMDD,
      scannedItems: result.scannedItems,
      matchedItems: result.matchedItems,
      newItems: result.newItems
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    const msg = String(e?.message || e)
    await recordCronRun({ success: false, error: msg })
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
