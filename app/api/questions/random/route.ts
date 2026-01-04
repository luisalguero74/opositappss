import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const count = parseInt(searchParams.get('count') || '85')

    // Obtener preguntas aleatorias
    const questions = await prisma.question.findMany({
      take: count,
      orderBy: {
        id: 'asc'
      }
    })

    // Mezclar aleatoriamente
    const shuffled = questions.sort(() => Math.random() - 0.5)

    return NextResponse.json({ questions: shuffled })

  } catch (error) {
    console.error('[Random Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener preguntas'
    }, { status: 500 })
  }
}
