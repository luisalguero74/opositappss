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

    if (String(user?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener todos los simulacros completados
    const simulations = await prisma.examSimulation.findMany({
      where: {
        completed: true
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // Calcular estadísticas generales
    const totalSimulations = simulations.length
    const avgScore = simulations.reduce((acc: number, s) => acc + s.score, 0) / totalSimulations || 0
    const avgTheoryScore = simulations.reduce((acc: number, s) => acc + s.theoryScore, 0) / totalSimulations || 0
    const avgPracticalScore = simulations.reduce((acc: number, s) => acc + s.practicalScore, 0) / totalSimulations || 0
    const avgTimeSpent = simulations.reduce((acc: number, s) => acc + s.timeSpent, 0) / totalSimulations || 0

    const passedCount = simulations.filter((s: any) => (s.score / 85) >= 0.5).length
    const passRate = (passedCount / totalSimulations) * 100 || 0

    return NextResponse.json({
      simulations,
      stats: {
        total: totalSimulations,
        avgScore: avgScore.toFixed(2),
        avgTheoryScore: avgTheoryScore.toFixed(2),
        avgPracticalScore: avgPracticalScore.toFixed(2),
        avgTimeSpent: avgTimeSpent.toFixed(0),
        passRate: passRate.toFixed(2)
      }
    })
  } catch (error) {
    console.error('[Admin Exam Stats] Error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
