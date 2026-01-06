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

    const safeQuestions = shuffled.map((q) => {
      let options: string[] = []
      try {
        if (Array.isArray((q as any).options)) {
          options = (q as any).options
        } else if (typeof (q as any).options === 'string') {
          const parsed = JSON.parse((q as any).options)
          options = Array.isArray(parsed) ? parsed : []
        }
      } catch {
        options = []
      }

      // Normalize correctAnswer to A/B/C/D when possible
      const raw = String((q as any).correctAnswer ?? '').trim()
      let correctAnswer = raw.toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        const idx = options.findIndex((opt) => opt === raw)
        correctAnswer = idx >= 0 ? ['A', 'B', 'C', 'D'][idx] : 'A'
      }

      return {
        ...q,
        options,
        correctAnswer
      }
    })

    return NextResponse.json({ questions: safeQuestions })

  } catch (error) {
    console.error('[Random Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener preguntas'
    }, { status: 500 })
  }
}
