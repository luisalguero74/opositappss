import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questions = await prisma.question.findMany({
      include: {
        questionnaire: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      questionnaireName: q.questionnaire.title,
      temaCodigo: q.temaCodigo,
      temaNumero: q.temaNumero,
      difficulty: q.difficulty,
      aiReviewed: q.aiReviewed,
      aiReviewedAt: q.aiReviewedAt?.toISOString()
    }))

    return NextResponse.json(formattedQuestions)
  } catch (error) {
    console.error('[Admin Questions] Error:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}
