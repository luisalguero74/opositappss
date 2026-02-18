import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/questionnaires/preview
 * Vista previa de preguntas que se seleccionarían
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const {
      temaIds,
      difficulty,
      questionCount,
      selectionMode
    } = await req.json()

    const questions: any[] = []

    for (const temaId of temaIds) {
      const whereClause: any = {
        temaId: temaId,
        reviewStatus: 'VALIDATED'
      }

      if (difficulty && difficulty.length > 0) {
        whereClause.difficulty = { in: difficulty }
      }

      const temaQuestions = await prisma.question.findMany({
        where: whereClause,
        select: {
          id: true,
          text: true,
          difficulty: true,
          tema: {
            select: {
              titulo: true
            }
          }
        },
        take: 10,
        orderBy: selectionMode === 'recientes' ? { createdAt: 'desc' } : undefined
      })

      questions.push(...temaQuestions.map(q => ({
        id: q.id,
        text: q.text,
        difficulty: q.difficulty || 'media',
        tema: q.tema?.titulo || 'Sin tema'
      })))
    }

    return NextResponse.json({
      questions: questions.slice(0, Math.min(questionCount, 50))
    })
  } catch (error) {
    console.error('Error loading preview:', error)
    return NextResponse.json(
      { error: 'Error al cargar vista previa' },
      { status: 500 }
    )
  }
}
