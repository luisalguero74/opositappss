import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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

    const { answers, score, correctAnswers, totalQuestions, timeSpent } = await req.json()

    // Crear un registro de intento como "Práctica Rápida"
    // Usamos un ID especial para identificar las prácticas rápidas
    
    // Buscar o crear un cuestionario virtual para práctica rápida
    let quickPracticeQuestionnaire = await prisma.questionnaire.findFirst({
      where: { 
        title: 'Práctica Rápida',
        type: 'quick-practice'
      }
    })

    if (!quickPracticeQuestionnaire) {
      quickPracticeQuestionnaire = await prisma.questionnaire.create({
        data: {
          title: 'Práctica Rápida',
          type: 'quick-practice',
          published: true
        }
      })
    }

    // Crear el registro del intento
    const attempt = await prisma.questionnaireAttempt.create({
      data: {
        userId: user.id,
        questionnaireId: quickPracticeQuestionnaire.id,
        score,
        correctAnswers,
        totalQuestions,
        timeSpent: timeSpent || 0,
        completedAt: new Date()
      }
    })

    // Guardar las respuestas individuales
    const userAnswers = await Promise.all(
      answers.map(async (answer: any) => {
        if (!answer.questionId) return null
        
        return prisma.userAnswer.create({
          data: {
            userId: user.id,
            questionId: answer.questionId,
            questionnaireId: quickPracticeQuestionnaire!.id,
            answer: answer.selectedAnswer || '',
            isCorrect: answer.isCorrect || false,
            createdAt: new Date()
          }
        }).catch(() => null) // Ignorar errores de preguntas duplicadas
      })
    )

    return NextResponse.json({ 
      success: true,
      attempt,
      savedAnswers: userAnswers.filter(a => a !== null).length
    })

  } catch (error) {
    console.error('Error saving quick practice stats:', error)
    return NextResponse.json({ 
      error: 'Error al guardar estadísticas',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
