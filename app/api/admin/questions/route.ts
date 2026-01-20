import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeParseOptions } from '@/lib/answer-normalization'

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
      options: safeParseOptions((q as any).options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      questionnaireName: q.questionnaire?.title ?? 'Sin cuestionario',
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

// Crear una nueva pregunta manualmente
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      questionnaireId,
      text,
      options,
      correctAnswer,
      explanation,
      temaCodigo,
      temaNumero,
      temaParte,
      temaTitulo,
      difficulty
    } = body

    if (!questionnaireId || !text || !Array.isArray(options) || options.length !== 4 || !correctAnswer) {
      return NextResponse.json(
        { error: 'Datos inválidos. Requiere questionnaireId, text, 4 options y correctAnswer' },
        { status: 400 }
      )
    }

    const trimmedOptions = options.map((opt: string) => String(opt || '').trim())
    const rawCorrect = String(correctAnswer).trim()
    const isLetterAnswer = ['A', 'B', 'C', 'D'].includes(rawCorrect.toUpperCase())

    if (!isLetterAnswer && !trimmedOptions.includes(rawCorrect)) {
      return NextResponse.json(
        { error: 'La respuesta correcta debe estar entre las opciones o ser A/B/C/D' },
        { status: 400 }
      )
    }

    // Asegurar que el cuestionario existe
    const questionnaire = await prisma.questionnaire.findUnique({ where: { id: questionnaireId } })
    if (!questionnaire) {
      return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
    }

    const created = await prisma.question.create({
      data: {
        questionnaireId,
        text: String(text).trim(),
        options: JSON.stringify(trimmedOptions),
        correctAnswer: rawCorrect,
        explanation: String(explanation || '').trim() || 'Explicación pendiente',
        temaCodigo: temaCodigo || null,
        temaNumero: typeof temaNumero === 'number' ? temaNumero : null,
        temaParte: temaParte || null,
        temaTitulo: temaTitulo || null,
        difficulty: difficulty || null
      }
    })

    // Actualizar la marca de tiempo del cuestionario para que refleje
    // que se han añadido preguntas nuevas y suba en los listados
    await prisma.questionnaire.update({
      where: { id: questionnaireId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(
      {
        success: true,
        question: {
          id: created.id,
          text: created.text,
          options: JSON.parse(created.options),
          correctAnswer: created.correctAnswer,
          explanation: created.explanation,
          questionnaireName: questionnaire.title,
          temaCodigo: created.temaCodigo,
          temaNumero: created.temaNumero,
          difficulty: created.difficulty
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Admin Questions Create] Error:', error)
    return NextResponse.json({ error: 'Error al crear pregunta' }, { status: 500 })
  }
}

