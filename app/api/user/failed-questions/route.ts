import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener preguntas falladas
    const failedAnswers = await prisma.userAnswer.findMany({
      where: {
        userId: user.id,
        isCorrect: false
      },
      include: {
        question: {
          include: {
            questionnaire: {
              select: { title: true, type: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Agrupar por pregunta y contar fallos
    const questionFailures = new Map<string, {
      question: any
      count: number
      lastFailed: Date
      questionnaire: any
    }>()

    for (const answer of failedAnswers) {
      const qId = answer.questionId
      if (!questionFailures.has(qId)) {
        questionFailures.set(qId, {
          question: answer.question,
          questionnaire: answer.question.questionnaire,
          count: 0,
          lastFailed: answer.createdAt
        })
      }
      const entry = questionFailures.get(qId)!
      entry.count++
      if (answer.createdAt > entry.lastFailed) {
        entry.lastFailed = answer.createdAt
      }
    }

    const failedQuestions = Array.from(questionFailures.values())
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      total: failedQuestions.length,
      questions: failedQuestions.map(q => ({
        questionId: q.question.id,
        text: q.question.text,
        options: JSON.parse(q.question.options),
        correctAnswer: q.question.correctAnswer,
        explanation: q.question.explanation,
        temaCodigo: q.question.temaCodigo,
        temaNumero: q.question.temaNumero,
        temaTitulo: q.question.temaTitulo,
        difficulty: q.question.difficulty,
        questionnaire: q.questionnaire,
        timesFailed: q.count,
        lastFailed: q.lastFailed
      }))
    })

  } catch (error) {
    console.error('[Failed Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener preguntas falladas'
    }, { status: 500 })
  }
}
