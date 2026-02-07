import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runBoeSecuritySocialMonitor } from '@/lib/boe-monitor'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const dateYYYYMMDD = typeof body?.dateYYYYMMDD === 'string' ? body.dateYYYYMMDD.trim() : undefined

  try {
    const result = await runBoeSecuritySocialMonitor({
      dateYYYYMMDD,
      notifyAdmins: false
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 })
  }
}
