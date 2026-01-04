import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Obtener sesión del usuario
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { questionnaireId, answers } = await request.json()

    if (!questionnaireId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    console.log(`[Submit] Usuario ${session.user.email} enviando ${answers.length} respuestas para cuestionario ${questionnaireId}`)

    // Guardar cada respuesta del usuario
    for (const ans of answers) {
      await prisma.userAnswer.create({
        data: {
          userId: session.user.id,
          questionId: ans.questionId,
          questionnaireId,
          answer: ans.selectedAnswer,
          isCorrect: ans.isCorrect
        }
      })
    }

    console.log(`[Submit] ✓ Respuestas guardadas exitosamente`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Submit] Error:', error)
    return NextResponse.json({ 
      error: 'Error al guardar respuestas: ' + String(error) 
    }, { status: 500 })
  }
}