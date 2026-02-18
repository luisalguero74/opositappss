import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/questionnaires/create
 * Crea un nuevo cuestionario usando banco de preguntas por tema
 */
export async function POST(req: NextRequest) {
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

    const {
      title,
      type,
      temaIds,
      difficulty,
      questionCount,
      distribution,
      selectionMode
    } = await req.json()

    // Validaciones
    if (!title || !temaIds || temaIds.length === 0) {
      return NextResponse.json(
        { error: 'Título y al menos un tema son obligatorios' },
        { status: 400 }
      )
    }

    // 1. Crear cuestionario
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: type || 'theory',
        published: false,
        archived: false
      }
    })

    // 2. Calcular distribución de preguntas por tema
    const distributionMap = calculateDistribution(
      temaIds,
      questionCount,
      distribution
    )

    // 3. Seleccionar y vincular preguntas
    let orderCounter = 1
    let totalLinked = 0

    for (const temaId of temaIds) {
      const numQuestionsForTema = distributionMap[temaId] || 0

      if (numQuestionsForTema === 0) continue

      // Construir filtros
      const whereClause: any = {
        temaId: temaId,
        reviewStatus: 'VALIDATED' // SOLO preguntas validadas
      }

      if (difficulty && difficulty.length > 0) {
        whereClause.difficulty = { in: difficulty }
      }

      // Construir orden
      let orderBy: any = {}
      switch (selectionMode) {
        case 'recientes':
          orderBy = { createdAt: 'desc' }
          break
        case 'menos_respondidas':
          // Nota: Esto requiere un count de userAnswers, simplificado por ahora
          orderBy = { createdAt: 'desc' }
          break
        default: // aleatoria
          // Para selección aleatoria, obtenemos más preguntas y shuffleamos
          break
      }

      // Obtener preguntas
      let questions = await prisma.question.findMany({
        where: whereClause,
        orderBy: orderBy,
        take: selectionMode === 'aleatoria' ? numQuestionsForTema * 3 : numQuestionsForTema
      })

      // Si es aleatoria, shuffle y tomar las necesarias
      if (selectionMode === 'aleatoria') {
        questions = shuffleArray(questions).slice(0, numQuestionsForTema)
      }

      // Crear relaciones N:N
      for (const question of questions) {
        await prisma.questionnaireQuestion.create({
          data: {
            questionnaireId: questionnaire.id,
            questionId: question.id,
            order: orderCounter++
          }
        })
        totalLinked++
      }
    }

    return NextResponse.json({
      success: true,
      questionnaireId: questionnaire.id,
      totalQuestions: totalLinked,
      distribution: distributionMap
    })
  } catch (error) {
    console.error('Error creating questionnaire:', error)
    return NextResponse.json(
      { error: 'Error al crear cuestionario' },
      { status: 500 }
    )
  }
}

/**
 * Calcular distribución de preguntas por tema
 */
function calculateDistribution(
  temaIds: string[],
  totalQuestions: number,
  mode: 'equitativa' | 'proporcional' | 'manual'
): Record<string, number> {
  const dist: Record<string, number> = {}

  if (mode === 'equitativa') {
    // Dividir equitativamente
    const base = Math.floor(totalQuestions / temaIds.length)
    const remainder = totalQuestions % temaIds.length

    temaIds.forEach((id, index) => {
      dist[id] = base + (index < remainder ? 1 : 0)
    })
  } else if (mode === 'proporcional') {
    // Por ahora, distribuir equitativamente
    // TODO: Implementar distribución proporcional basada en cantidad de preguntas disponibles
    const base = Math.floor(totalQuestions / temaIds.length)
    const remainder = totalQuestions % temaIds.length

    temaIds.forEach((id, index) => {
      dist[id] = base + (index < remainder ? 1 : 0)
    })
  }

  return dist
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
