import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Get all quiz attempts from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const attempts = await prisma.questionnaireAttempt.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: ninetyDaysAgo }
      },
      select: {
        createdAt: true
      }
    })

    // Group by date
    const activityMap = new Map<string, number>()
    
    attempts.forEach(attempt => {
      const date = new Date(attempt.createdAt)
      const dateStr = date.toISOString().split('T')[0]
      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1)
    })

    const activities = Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count
    }))

    return NextResponse.json({ activities })

  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 })
  }
}
