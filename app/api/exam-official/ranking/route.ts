import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET - Obtener ranking global de exámenes oficiales
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    // Obtener rankings ordenados por puntuación descendente
    const rankings = await prisma.examRanking.findMany({
      take: limit,
      skip,
      orderBy: [
        { totalScore: 'desc' },
        { createdAt: 'asc' } // En caso de empate, quien lo hizo primero
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attempt: {
          select: {
            id: true,
            testScore: true,
            practicalScore: true,
            testCorrect: true,
            testIncorrect: true,
            testBlank: true,
            practicalCorrect: true,
            practicalIncorrect: true,
            practicalBlank: true,
            completedAt: true,
            exam: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    // Contar total de participantes
    const totalParticipants = await prisma.examRanking.count()

    // Formatear respuesta
    const formattedRankings = rankings.map((r, index) => ({
      rank: skip + index + 1, // Rank real basado en paginación
      userId: r.user.id,
      userName: r.userName || r.user.name || 'Usuario anónimo',
      email: r.user.email,
      totalScore: parseFloat(r.totalScore.toFixed(2)),
      testScore: parseFloat(r.attempt.testScore.toFixed(2)),
      practicalScore: parseFloat(r.attempt.practicalScore.toFixed(2)),
      statistics: {
        test: {
          correct: r.attempt.testCorrect,
          incorrect: r.attempt.testIncorrect,
          blank: r.attempt.testBlank
        },
        practical: {
          correct: r.attempt.practicalCorrect,
          incorrect: r.attempt.practicalIncorrect,
          blank: r.attempt.practicalBlank
        }
      },
      examTitle: r.attempt.exam.title,
      completedAt: r.attempt.completedAt,
      createdAt: r.createdAt
    }))

    return NextResponse.json({
      rankings: formattedRankings,
      pagination: {
        total: totalParticipants,
        page,
        limit,
        totalPages: Math.ceil(totalParticipants / limit)
      }
    })

  } catch (error) {
    console.error('[Exam Ranking GET] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener ranking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
