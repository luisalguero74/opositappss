import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '5')
    
    // Limit to reasonable numbers
    const questionCount = Math.min(Math.max(count, 5), 20)

    // Get random questions from the database
    const totalQuestions = await prisma.question.count()
    
    if (totalQuestions === 0) {
      return NextResponse.json({ error: 'No hay preguntas disponibles' }, { status: 404 })
    }

    // Get random questions using a more efficient approach
    const skip = Math.max(0, Math.floor(Math.random() * (totalQuestions - questionCount)))
    
    const questions = await prisma.question.findMany({
      take: questionCount,
      skip,
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
      }
    })

    // Shuffle the selected questions for more randomness
    const shuffled = questions.sort(() => Math.random() - 0.5)

    return NextResponse.json({ questions: shuffled })

  } catch (error) {
    console.error('Error fetching quick practice questions:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}
