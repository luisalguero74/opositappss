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

    // Get questionnaire attempts
    const attempts = await prisma.questionnaireAttempt.findMany({
      where: { userId: user.id },
      select: {
        score: true,
        totalQuestions: true
      }
    })

    if (attempts.length === 0) {
      return NextResponse.json({
        totalQuestions: 0,
        correctPercentage: 0,
        totalAttempts: 0
      })
    }

    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0)
    const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0)
    const correctPercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0

    return NextResponse.json({
      totalQuestions,
      correctPercentage,
      totalAttempts: attempts.length
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
