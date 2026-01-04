import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get practical case
    const practicalCase = await prisma.questionnaire.findFirst({
      where: {
        id: resolvedParams.id,
        type: 'practical'
      },
      include: {
        questions: true
      }
    })

    if (!practicalCase) {
      return NextResponse.json({ error: 'Supuesto no encontrado' }, { status: 404 })
    }

    // Get all attempts for this practical case
    const attempts = await prisma.questionnaireAttempt.findMany({
      where: {
        questionnaireId: resolvedParams.id
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // Calculate question-level statistics
    const questionStatsMap = new Map<string, {
      questionId: string
      text: string
      totalAttempts: number
      failures: number
      correctAnswer: string
      explanation: string
    }>()

    attempts.forEach((attempt: any) => {
      attempt.answers.forEach((answer: any) => {
        if (!questionStatsMap.has(answer.questionId)) {
          questionStatsMap.set(answer.questionId, {
            questionId: answer.questionId,
            text: answer.question.text,
            totalAttempts: 0,
            failures: 0,
            correctAnswer: answer.question.correctAnswer,
            explanation: answer.question.explanation
          })
        }

        const stats = questionStatsMap.get(answer.questionId)!
        stats.totalAttempts++
        if (!answer.isCorrect) {
          stats.failures++
        }
      })
    })

    const questionStats = Array.from(questionStatsMap.values()).map(stat => ({
      ...stat,
      failureRate: (stat.failures / stat.totalAttempts) * 100
    }))

    return NextResponse.json({
      title: practicalCase.title,
      attempts,
      questionStats
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 })
  }
}
