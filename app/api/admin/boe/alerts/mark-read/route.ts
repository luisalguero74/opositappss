import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureBoeMonitorTablesExist } from '@/lib/boe-db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await ensureBoeMonitorTablesExist()

  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
  const isRead: boolean = typeof body?.isRead === 'boolean' ? body.isRead : true

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids requerido' }, { status: 400 })
  }

  const result = await prisma.boeAlertItem.updateMany({
    where: { id: { in: ids } },
    data: { isRead }
  })

  return NextResponse.json({ success: true, updated: result.count })
}
