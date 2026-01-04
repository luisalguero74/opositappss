import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin ve todos los cuestionarios (publicados y borradores)
    const questionnaires = await prisma.questionnaire.findMany({
      include: { 
        questions: {
          select: {
            id: true,
            text: true,
            options: true,
            correctAnswer: true,
            explanation: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parsear las opciones de JSON
    const parsedQuestionnaires = questionnaires.map(q => ({
      ...q,
      questions: q.questions.map(question => ({
        ...question,
        options: JSON.parse(question.options)
      }))
    }))

    return NextResponse.json(parsedQuestionnaires)
  } catch (error) {
    console.error('Error fetching questionnaires:', error)
    return NextResponse.json({ error: 'Error al cargar cuestionarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { title, type, questions, solution } = await request.json()

  const questionnaire = await prisma.questionnaire.create({
    data: {
      title,
      type,
      questions: {
        create: questions.map((q: { text: string; options: string[]; correctAnswer: string; explanation: string }) => ({
          text: q.text,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      }
    }
  })

  if (solution) {
    await prisma.solution.create({
      data: {
        questionnaireId: questionnaire.id,
        content: solution
      }
    })
  }

  return NextResponse.json({ success: true })
}