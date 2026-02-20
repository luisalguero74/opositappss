import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: questionnaireId } = await params

    // Get all attempts for this questionnaire by this user
    const attempts = await prisma.questionnaireAttempt.findMany({
      where: {
        userId: user.id,
        questionnaireId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10, // Last 10 attempts
      select: {
        id: true,
        score: true,
        totalQuestions: true,
        createdAt: true
      }
    })

    const history = attempts.map((attempt, index) => ({
      attemptNumber: attempts.length - index,
      id: attempt.id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
      date: attempt.createdAt
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching attempt history:', error)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
