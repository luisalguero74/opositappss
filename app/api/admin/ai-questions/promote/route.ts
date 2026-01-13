import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rebalanceQuestionsABCD } from '../../../../../src/lib/answer-alternation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function mapDifficulty(difficulty: string | null | undefined): string | null {
  if (!difficulty) return null
  const d = String(difficulty).toLowerCase()
  if (d === 'easy') return 'facil'
  if (d === 'medium') return 'media'
  if (d === 'hard') return 'dificil'
  if (d === 'facil' || d === 'media' || d === 'dificil') return d
  return difficulty
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const normalizeSecret = (value: string | null | undefined) =>
      String(value || '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .trim()

    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    const receivedApiKey = normalizeSecret(req.headers.get('x-api-key'))
    const apiKeyOk = Boolean(expectedApiKey && receivedApiKey && expectedApiKey === receivedApiKey)
    const isAdminSession = Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
    if (!isAdminSession && !apiKeyOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const questionIds: string[] = Array.isArray(body.questionIds) ? body.questionIds : []
    const questionnaireTitle: string | undefined = body.questionnaireTitle

    if (!questionnaireTitle || typeof questionnaireTitle !== 'string') {
      return NextResponse.json({ error: 'questionnaireTitle es requerido' }, { status: 400 })
    }

    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere array questionIds' }, { status: 400 })
    }

    const aiQuestions = await prisma.generatedQuestion.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        difficulty: true,
        reviewed: true
      }
    })

    if (aiQuestions.length === 0) {
      return NextResponse.json({ error: 'No se encontraron preguntas IA válidas' }, { status: 404 })
    }

    const notReviewed = aiQuestions.filter(q => !q.reviewed)
    if (notReviewed.length > 0) {
      return NextResponse.json(
        { error: `Hay ${notReviewed.length} preguntas sin revisar. Aplica QA primero.` },
        { status: 400 }
      )
    }

    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: questionnaireTitle,
        type: 'theory',
        published: false,
        statement: `Importadas desde preguntas IA revisadas (${aiQuestions.length})`
      }
    })

    const rebalanced = rebalanceQuestionsABCD(
      aiQuestions.map(q => ({
        id: q.id,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer
      })),
      2
    )
    const rebalanceById = new Map<string, { options: string[]; correctAnswer: string }>(
      rebalanced.map((x: any) => [String(x.id), { options: x.options, correctAnswer: x.correctAnswer }])
    )

    const created = await Promise.all(
      aiQuestions.map(q =>
        prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: q.text,
            options: JSON.stringify(rebalanceById.get(q.id)?.options ?? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options)),
            correctAnswer: rebalanceById.get(q.id)?.correctAnswer ?? q.correctAnswer,
            explanation: q.explanation || 'Explicación pendiente',
            difficulty: mapDifficulty(q.difficulty),
            aiReviewed: true,
            aiReviewedAt: new Date()
          }
        } as any)
      )
    )

    return NextResponse.json({
      success: true,
      questionnaire: { id: questionnaire.id, title: questionnaire.title },
      createdQuestions: created.length
    })
  } catch (error: any) {
    console.error('[AI Questions Promote] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al enviar preguntas IA a la base de datos' },
      { status: 500 }
    )
  }
}
