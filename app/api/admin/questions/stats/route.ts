import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get total counts by status
    const [total, validated, pending, quarantined] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { reviewStatus: 'VALIDATED' } }),
      prisma.question.count({ where: { reviewStatus: 'PENDING' } }),
      prisma.question.count({ where: { reviewStatus: 'QUARANTINED' } })
    ])

    return NextResponse.json({
      total,
      validated,
      pending,
      quarantined
    })
  } catch (error) {
    console.error('[Questions Stats] Error:', error)
    return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 })
  }
}
