import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const { theoryAnswers, practicalAnswers, timeSpent } = body

    const simulation = await prisma.examSimulation.findUnique({
      where: { id }
    })

    if (!simulation || simulation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Simulacro no encontrado' }, { status: 404 })
    }

    const theoryQuestions = JSON.parse(simulation.theoryQuestions)
    const practicalCase = JSON.parse(simulation.practicalCase)

    // Calcular puntuación teoría
    let theoryScore = 0
    theoryQuestions.forEach((q: any, idx: number) => {
      if (theoryAnswers[idx] === q.correctAnswer) {
        theoryScore++
      }
    })

    // Calcular puntuación práctica
    let practicalScore = 0
    practicalCase.questions.forEach((q: any, idx: number) => {
      if (practicalAnswers[idx] === q.correctAnswer) {
        practicalScore++
      }
    })

    const totalScore = theoryScore + practicalScore

    // Actualizar simulacro
    const updated = await prisma.examSimulation.update({
      where: { id },
      data: {
        userAnswers: JSON.stringify({ theory: theoryAnswers, practical: practicalAnswers }),
        score: totalScore,
        theoryScore,
        practicalScore,
        timeSpent,
        completed: true,
        completedAt: new Date()
      }
    })

    console.log(`[Exam Simulation] Usuario ${session.user.email} completó simulacro: ${totalScore}/85`)

    return NextResponse.json({
      score: totalScore,
      theoryScore,
      practicalScore,
      totalQuestions: 85,
      percentage: ((totalScore / 85) * 100).toFixed(2)
    })
  } catch (error) {
    console.error('[Exam Simulation Submit] Error:', error)
    return NextResponse.json({ error: 'Error al enviar respuestas' }, { status: 500 })
  }
}
