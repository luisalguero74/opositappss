import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_JOBS = ['general', 'all', 'especifico'] as const
type Job = (typeof VALID_JOBS)[number]

// Manual admin endpoint to trigger cron runner on demand.
// It calls the existing cron endpoint internally, passing x-vercel-cron.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ job: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const params = await context.params
  const job = params.job as Job

  if (!VALID_JOBS.includes(job)) {
    return NextResponse.json({ error: 'Job inválido' }, { status: 400 })
  }

  const origin = new URL(req.url).origin

  const res = await fetch(`${origin}/api/cron/run/${job}`, {
    method: 'GET',
    headers: {
      'x-vercel-cron': '1'
    },
    cache: 'no-store'
  })

  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status })
    } catch {
      return NextResponse.json(
        { error: 'Respuesta JSON inválida desde cron', status: res.status, body: text.slice(0, 2000) },
        { status: 502 }
      )
    }
  }

  return NextResponse.json(
    { status: res.status, body: text.slice(0, 2000) },
    { status: res.status }
  )
}
