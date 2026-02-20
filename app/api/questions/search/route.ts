import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const tema = searchParams.get('tema') || ''
    const onlyFailed = searchParams.get('failed') === 'true'
    const onlyMarked = searchParams.get('marked') === 'true'

    // Build where clause
    const where: any = {}

    if (query) {
      where.text = {
        contains: query,
        mode: 'insensitive'
      }
    }

    if (tema) {
      where.OR = [
        { temaCodigo: { contains: tema, mode: 'insensitive' } },
        { temaTitulo: { contains: tema, mode: 'insensitive' } }
      ]
    }

    // Get base questions
    let questions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        text: true,
        temaCodigo: true,
        temaNumero: true,
        temaTitulo: true,
        userAnswers: onlyFailed ? {
          where: { userId: user.id },
          select: { isCorrect: true }
        } : false,
        markedBy: onlyMarked ? {
          where: { userId: user.id }
        } : false
      },
      take: 100
    })

    // Filter by failed if needed
    if (onlyFailed) {
      questions = questions.filter(q => 
        q.userAnswers && q.userAnswers.some((a: any) => !a.isCorrect)
      )
    }

    // Filter by marked if needed
    if (onlyMarked) {
      questions = questions.filter(q => 
        q.markedBy && q.markedBy.length > 0
      )
    }

    // Clean up response
    const cleanQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      temaCodigo: q.temaCodigo,
      temaNumero: q.temaNumero,
      temaTitulo: q.temaTitulo
    }))

    return NextResponse.json({ questions: cleanQuestions })
  } catch (error) {
    console.error('Error searching questions:', error)
    return NextResponse.json({ error: 'Error en la búsqueda' }, { status: 500 })
  }
}
