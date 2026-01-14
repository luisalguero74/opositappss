import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const whereClause = filter !== 'all' ? { action: filter } : {}

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[Audit Logs Error]:', error)
    return NextResponse.json(
      { error: 'Error al obtener logs de auditoría' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { action, entity, entityId, changes, reason } = body

    const newLog = await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || undefined,
        adminEmail: session.user.email || 'unknown',
        changes: changes ? JSON.stringify(changes) : undefined,
        reason: reason || undefined
      }
    })

    return NextResponse.json({ success: true, log: newLog })
  } catch (error) {
    console.error('[Audit Log Creation Error]:', error)
    return NextResponse.json(
      { error: 'Error al crear log de auditoría' },
      { status: 500 }
    )
  }
}
