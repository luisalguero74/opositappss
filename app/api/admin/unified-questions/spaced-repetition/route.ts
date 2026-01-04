import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para vincular preguntas con sistemas de repaso:
 * - Preguntas marcadas (dudosas/fallidas)
 * - Sistema de repaso espaciado (Spaced Repetition)
 * - Seguimiento de intentos fallidos
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const {
      questionId,
      action, // 'mark_failed', 'mark_doubt', 'mark_review', 'spaced_repetition'
      isCorrect,
      difficulty,
      tema
    } = await req.json()

    if (!questionId || !action) {
      return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }

    // 1. Si es incorrecta, marcarla como fallida
    if (action === 'mark_failed' && !isCorrect) {
      const marked = await prisma.markedQuestion.findUnique({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId
          }
        }
      }).catch(() => null)

      if (marked) {
        await prisma.markedQuestion.update({
          where: {
            userId_questionId: {
              userId: session.user.id,
              questionId
            }
          },
          data: {
            type: 'failed',
            timesFailed: marked.timesFailed + 1,
            lastFailed: new Date()
          }
        })
      } else {
        await prisma.markedQuestion.create({
          data: {
            userId: session.user.id,
            questionId,
            type: 'failed',
            timesFailed: 1,
            lastFailed: new Date()
          }
        })
      }
    }

    // 2. Si es duda, marcarla para review
    if (action === 'mark_doubt') {
      await prisma.markedQuestion.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId
          }
        },
        update: {
          type: 'doubt'
        },
        create: {
          userId: session.user.id,
          questionId,
          type: 'doubt'
        }
      })
    }

    // 3. Sistema de repaso espaciado (Spaced Repetition)
    if (action === 'spaced_repetition') {
      let card = await prisma.spacedRepetitionCard.findUnique({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId
          }
        }
      }).catch(() => null)

      if (!card) {
        // Crear nueva tarjeta
        card = await prisma.spacedRepetitionCard.create({
          data: {
            userId: session.user.id,
            questionId,
            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0
          }
        })
      }

      // Actualizar según el algoritmo SM-2 (Spaced Repetition)
      let newEaseFactor = card.easeFactor
      let newInterval = card.interval
      let newRepetitions = card.repetitions

      if (isCorrect) {
        newRepetitions++
        if (newRepetitions === 1) {
          newInterval = 1
        } else if (newRepetitions === 2) {
          newInterval = 3
        } else {
          newInterval = Math.ceil(newInterval * newEaseFactor)
        }
        newEaseFactor = Math.max(1.3, newEaseFactor + (0.1 - (5 - 5) * 0.08))
      } else {
        newRepetitions = 0
        newInterval = 1
        newEaseFactor = Math.max(1.3, newEaseFactor - 0.2)
      }

      await prisma.spacedRepetitionCard.update({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId
          }
        },
        data: {
          easeFactor: newEaseFactor,
          interval: newInterval,
          repetitions: newRepetitions,
          nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
          lastReviewedAt: new Date(),
          totalReviews: card.totalReviews + 1,
          correctReviews: isCorrect ? card.correctReviews + 1 : card.correctReviews
        }
      })
    }

    // 4. Actualizar estadísticas del tema
    if (tema) {
      // Registrar para análisis posterior
      console.log(`[Stats] Usuario ${session.user.id}: ${action} en pregunta ${questionId} (tema: ${tema})`)
    }

    return NextResponse.json({
      success: true,
      action,
      questionId,
      message: `Pregunta ${action === 'mark_failed' ? 'marcada como fallida' : action === 'mark_doubt' ? 'marcada para review' : 'añadida a repaso espaciado'}`
    }, { status: 200 })
  } catch (error) {
    console.error('Error en seguimiento de preguntas:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

/**
 * GET: Obtener preguntas para repaso basadas en Spaced Repetition
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // 'spaced', 'marked', 'failed'

    let cards: any[] = []

    if (type === 'spaced') {
      // Preguntas para repaso espaciado (cuyas fechas de revisión han llegado)
      cards = await prisma.spacedRepetitionCard.findMany({
        where: {
          userId: session.user.id,
          nextReviewDate: { lte: new Date() }
        },
        include: { question: true },
        orderBy: { nextReviewDate: 'asc' },
        take: limit
      })
    } else if (type === 'marked') {
      // Preguntas marcadas (dudosas, fallidas, etc.)
      const marked = await prisma.markedQuestion.findMany({
        where: { userId: session.user.id },
        include: { question: true },
        orderBy: { markedAt: 'desc' },
        take: limit
      })
      return NextResponse.json({
        success: true,
        type: 'marked',
        questions: marked.map(m => ({
          questionId: m.question.id,
          text: m.question.text,
          options: JSON.parse(m.question.options),
          correctAnswer: m.question.correctAnswer,
          markType: m.type,
          timesFailed: m.timesFailed,
          notes: m.notes
        }))
      })
    } else if (type === 'failed') {
      // Preguntas que se han fallado (para refuerzo)
      const failed = await prisma.markedQuestion.findMany({
        where: {
          userId: session.user.id,
          type: 'failed'
        },
        include: { question: true },
        orderBy: { timesFailed: 'desc' },
        take: limit
      })
      return NextResponse.json({
        success: true,
        type: 'failed',
        questions: failed.map(f => ({
          questionId: f.question.id,
          text: f.question.text,
          options: JSON.parse(f.question.options),
          correctAnswer: f.question.correctAnswer,
          timesFailed: f.timesFailed,
          lastFailed: f.lastFailed
        }))
      })
    }

    return NextResponse.json({
      success: true,
      type: 'spaced',
      dueCount: cards.length,
      questions: cards.map(c => ({
        cardId: c.id,
        questionId: c.question.id,
        text: c.question.text,
        options: JSON.parse(c.question.options),
        correctAnswer: c.question.correctAnswer,
        easeFactor: c.easeFactor,
        interval: c.interval,
        repetitions: c.repetitions,
        totalReviews: c.totalReviews,
        correctReviews: c.correctReviews,
        nextReviewDate: c.nextReviewDate
      }))
    })
  } catch (error) {
    console.error('Error obteniendo preguntas para repaso:', error)
    return NextResponse.json(
      { error: 'Error al obtener preguntas' },
      { status: 500 }
    )
  }
}
