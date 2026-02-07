import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCorrectAnswerToUpperLetter, safeParseOptions } from '@/lib/answer-normalization'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin ve todos los cuestionarios (incluidos archivados) para poder gestionarlos
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
      // Ordenar por la fecha de última actualización para que los temas
      // recientemente modificados (por ejemplo, al añadir preguntas) aparezcan primero
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Parsear las opciones de JSON de forma robusta
    const parsedQuestionnaires = questionnaires.map(q => ({
      ...q,
      questions: q.questions.map(question => {
        let options: string[] = []
        try {
          const parsed = JSON.parse(question.options)
          options = Array.isArray(parsed) ? parsed : []
        } catch {
          options = []
        }
        return {
          ...question,
          options
        }
      })
    }))

    return NextResponse.json(parsedQuestionnaires)
  } catch (error) {
    console.error('Error fetching questionnaires:', error)
    return NextResponse.json({ error: 'Error al cargar cuestionarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, type, questions, solution } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions es requerido' }, { status: 400 })
    }

    const normalizedQuestions = questions.map((q: { text: string; options: any; correctAnswer: any; explanation: string }) => {
      const rawOptions = Array.isArray(q.options) ? q.options : safeParseOptions(q.options)
      const opts = rawOptions.map((o: any) => String(o ?? '').trim()).filter(Boolean)
      const normalizedCorrect = normalizeCorrectAnswerToUpperLetter(q.correctAnswer, opts)
      if (!normalizedCorrect) {
        const preview = String(q.text || '').trim().slice(0, 80)
        throw new Error(`correctAnswer inválida para pregunta: "${preview}"`)
      }
      return {
        text: String(q.text || '').trim(),
        options: JSON.stringify(opts),
        correctAnswer: normalizedCorrect,
        explanation: String(q.explanation || '')
      }
    })

    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type,
        questions: {
          create: normalizedQuestions
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
  } catch (error) {
    console.error('Error creating questionnaire:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear cuestionario' },
      { status: 400 }
    )
  }
}