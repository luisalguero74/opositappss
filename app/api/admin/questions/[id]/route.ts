import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT - Actualizar una pregunta
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { text, options, correctAnswer, explanation } = body

    // Validaciones básicas de formato
    if (!text || !Array.isArray(options) || options.length !== 4 || !correctAnswer || !explanation) {
      return NextResponse.json({ 
        error: 'Datos inválidos. Se requieren: text, options (array de 4), correctAnswer y explanation' 
      }, { status: 400 })
    }

    // Aceptar tanto respuestas tipo texto completo como letras A/B/C/D
    const rawCorrect = String(correctAnswer).trim()
    const isLetterAnswer = ['A', 'B', 'C', 'D'].includes(rawCorrect.toUpperCase())

    if (!isLetterAnswer && !options.includes(correctAnswer)) {
      return NextResponse.json({ 
        error: 'La respuesta correcta debe estar entre las opciones proporcionadas o ser A, B, C o D' 
      }, { status: 400 })
    }

    // Actualizar la pregunta
    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        text: text.trim(),
        options: JSON.stringify(options.map((opt: string) => opt.trim())),
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim()
      }
    })

    console.log(`[Admin] Pregunta ${id} actualizada por ${session.user.email}`)

    return NextResponse.json({ 
      success: true,
      question: {
        id: updatedQuestion.id,
        text: updatedQuestion.text,
        options: JSON.parse(updatedQuestion.options),
        correctAnswer: updatedQuestion.correctAnswer,
        explanation: updatedQuestion.explanation
      }
    })
  } catch (error) {
    console.error('[Admin Questions Update] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar la pregunta' }, { status: 500 })
  }
}
