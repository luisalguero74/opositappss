import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get all published practical cases with user's attempts
    const cases = await prisma.questionnaire.findMany({
      where: {
        type: 'practical',
        published: true
      },
      include: {
        _count: {
          select: { questions: true }
        },
        attempts: {
          where: {
            userId: session.user.id
          },
          orderBy: {
            completedAt: 'desc'
          },
          take: 1 // Last attempt
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate best score for each case
    const casesWithStats = await Promise.all(
      cases.map(async (c: any) => {
        const allAttempts = await prisma.questionnaireAttempt.findMany({
          where: {
            userId: session.user.id,
            questionnaireId: c.id
          },
          select: {
            score: true,
            correctAnswers: true,
            totalQuestions: true,
            completedAt: true
          }
        })

        const bestScore = allAttempts.length > 0
          ? Math.max(...allAttempts.map((a: any) => a.score))
          : undefined

        return {
          ...c,
          attempts: allAttempts,
          bestScore,
          lastAttempt: allAttempts.length > 0 ? allAttempts[0] : undefined
        }
      })
    )

    return NextResponse.json({ cases: casesWithStats })
  } catch (error) {
    console.error('Error fetching practical cases:', error)
    return NextResponse.json({ error: 'Error al cargar supuestos' }, { status: 500 })
  }
}
