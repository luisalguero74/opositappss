import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Actualizar tarjetas de repetición espaciada
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

    const { questionId, quality } = await req.json()

    // SM-2 Algorithm
    let card = await prisma.spacedRepetitionCard.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId
        }
      }
    })

    if (!card) {
      // Crear nueva tarjeta
      card = await prisma.spacedRepetitionCard.create({
        data: {
          userId: user.id,
          questionId,
          easeFactor: 2.5,
          interval: 1,
          repetitions: quality >= 3 ? 1 : 0,
          nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
    } else {
      // Actualizar según SM-2
      let { easeFactor, interval, repetitions } = card

      if (quality >= 3) {
        if (repetitions === 0) {
          interval = 1
        } else if (repetitions === 1) {
          interval = 6
        } else {
          interval = Math.round(interval * easeFactor)
        }
        repetitions += 1
      } else {
        repetitions = 0
        interval = 1
      }

      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

      const nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000)

      card = await prisma.spacedRepetitionCard.update({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId
          }
        },
        data: {
          easeFactor,
          interval,
          repetitions,
          nextReviewDate,
          lastReviewedAt: new Date()
        }
      })
    }

    return NextResponse.json({ card })

  } catch (error) {
    console.error('[Spaced Repetition] Error:', error)
    return NextResponse.json({ 
      error: 'Error al actualizar repetición espaciada'
    }, { status: 500 })
  }
}

// Obtener tarjetas para repasar
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

    const now = new Date()

    const cards = await prisma.spacedRepetitionCard.findMany({
      where: {
        userId: user.id,
        nextReviewDate: {
          lte: now
        }
      },
      include: {
        question: true
      },
      orderBy: { nextReviewDate: 'asc' },
      take: 20
    })

    return NextResponse.json({ cards, total: cards.length })

  } catch (error) {
    console.error('[Spaced Repetition] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener tarjetas'
    }, { status: 500 })
  }
}
