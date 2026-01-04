import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { answers, timeSpent } = await request.json()

    // Get the practical case with questions
    const practicalCase = await prisma.questionnaire.findFirst({
      where: {
        id: id,
        type: 'practical'
      },
      include: {
        questions: true
      }
    })

    if (!practicalCase) {
      return NextResponse.json({ error: 'Supuesto no encontrado' }, { status: 404 })
    }

    // Calculate score
    let correctAnswers = 0
    const totalQuestions = practicalCase.questions.length

    practicalCase.questions.forEach((question: any) => {
      const userAnswer = answers.find((a: any) => a.questionId === question.id)
      if (userAnswer && userAnswer.selectedAnswer === question.correctAnswer) {
        correctAnswers++
      }
    })

    const score = (correctAnswers / totalQuestions) * 100

    // Create attempt record
    const attempt = await prisma.questionnaireAttempt.create({
      data: {
        userId: session.user.id,
        questionnaireId: id,
        score,
        correctAnswers,
        totalQuestions,
        timeSpent,
        completedAt: new Date()
      }
    })

    // Save individual answers
    const answerPromises = answers.map((answer: any) => {
      const question = practicalCase.questions.find((q: any) => q.id === answer.questionId)
      const isCorrect = question ? answer.selectedAnswer === question.correctAnswer : false

      return prisma.userAnswer.create({
        data: {
          userId: session.user.id,
          questionId: answer.questionId,
          questionnaireId: practicalCase.id,
          answer: answer.selectedAnswer,
          isCorrect,
          attemptId: attempt.id
        }
      })
    })

    await Promise.all(answerPromises)

    return NextResponse.json({
      score,
      scorePercentage: score,
      correctAnswers,
      totalQuestions,
      attemptId: attempt.id,
      timeSpent
    })
  } catch (error) {
    console.error('Error submitting practical case:', error)
    return NextResponse.json({ error: 'Error al enviar respuestas' }, { status: 500 })
  }
}
