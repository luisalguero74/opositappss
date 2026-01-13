import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCorrectAnswerLetter, safeParseOptions } from '@/lib/answer-normalization'

// Marcar pregunta
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { questionId, type, notes } = await req.json()

    const marked = await prisma.markedQuestion.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId
        }
      },
      update: {
        type,
        notes,
        markedAt: new Date()
      },
      create: {
        userId: user.id,
        questionId,
        type,
        notes
      }
    })

    return NextResponse.json({ marked })

  } catch (error) {
    console.error('[Mark Question] Error:', error)
    return NextResponse.json({ 
      error: 'Error al marcar pregunta'
    }, { status: 500 })
  }
}

// Obtener preguntas marcadas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const marked = await prisma.markedQuestion.findMany({
      where: {
        userId: user.id,
        ...(type && { type })
      },
      include: {
        question: true
      },
      orderBy: { markedAt: 'desc' }
    })

    const normalized = marked.map((m: any) => {
      const options = safeParseOptions(m.question?.options)
      const correctLetter = getCorrectAnswerLetter(String(m.question?.correctAnswer ?? ''), options)
      return {
        ...m,
        question: {
          ...m.question,
          options,
          correctAnswer: (correctLetter ?? 'a').toUpperCase()
        }
      }
    })

    return NextResponse.json({ marked: normalized })

  } catch (error) {
    console.error('[Marked Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener preguntas marcadas'
    }, { status: 500 })
  }
}

// Eliminar marca
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({ error: 'questionId requerido' }, { status: 400 })
    }

    await prisma.markedQuestion.delete({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Unmark Question] Error:', error)
    return NextResponse.json({ 
      error: 'Error al desmarcar pregunta'
    }, { status: 500 })
  }
}
