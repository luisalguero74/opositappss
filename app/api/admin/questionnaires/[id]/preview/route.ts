import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/questionnaires/[id]/preview
 * Obtiene el cuestionario con sus preguntas para vista previa
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id: questionnaireId } = await context.params

    // Obtener cuestionario
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        _count: {
          select: { questionnaireQuestions: true }
        }
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
    }

    // Obtener preguntas vinculadas
    const questionnaireQuestions = await prisma.questionnaireQuestion.findMany({
      where: { questionnaireId },
      include: {
        question: true
      },
      orderBy: { order: 'asc' }
    })

    const questions = questionnaireQuestions.map(qq => {
      const q = qq.question
      let options: string[] = []
      try {
        options = JSON.parse(q.options)
      } catch {
        options = [q.options]
      }

      return {
        id: q.id,
        text: q.text,
        options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'media',
        temaCodigo: q.temaCodigo || 'N/A'
      }
    })

    return NextResponse.json({
      questionnaire,
      questions
    })
  } catch (error) {
    console.error('Error loading questionnaire preview:', error)
    return NextResponse.json(
      { error: 'Error al cargar vista previa' },
      { status: 500 }
    )
  }
}
