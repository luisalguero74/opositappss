import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const questions = await prisma.question.findMany({
      where: { temaCodigo: 'SIN_TEMA' },
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        difficulty: true,
        reviewStatus: true,
        temaCodigo: true,
        temaId: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Cargar las primeras 100 para no sobrecargar
    })

    const total = await prisma.question.count({
      where: { temaCodigo: 'SIN_TEMA' }
    })

    return NextResponse.json({
      questions: questions.map(q => ({
        ...q,
        options: JSON.parse(q.options as string)
      })),
      total
    })
  } catch (error) {
    console.error('Error loading questions:', error)
    return NextResponse.json({ error: 'Error loading questions' }, { status: 500 })
  }
}
