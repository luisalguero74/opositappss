import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar preguntas para revisión
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('[Questions Review] Session:', session ? `User: ${session.user?.email}, Role: ${session.user?.role}` : 'No session')
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      console.log('[Questions Review] Unauthorized - Role:', session?.user?.role)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const questions = await prisma.question.findMany({
      where: {
        temaCodigo: { not: null } // Solo preguntas vinculadas a temas
      },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            published: true
          }
        }
      },
      orderBy: [
        { temaParte: 'asc' },
        { temaNumero: 'asc' }
      ]
    })

    console.log('[Questions Review] Returning', questions.length, 'questions')
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('[Questions Review] Error:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}

// PUT - Editar pregunta
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, text, options, correctAnswer, explanation, difficulty } = await req.json()

    const updated = await prisma.question.update({
      where: { id },
      data: {
        text,
        options,
        correctAnswer,
        explanation,
        difficulty
      }
    })

    return NextResponse.json({ success: true, question: updated })
  } catch (error) {
    console.error('[Questions Review] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar pregunta' }, { status: 500 })
  }
}

// DELETE - Eliminar pregunta
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await req.json()

    await prisma.question.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Questions Review] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar pregunta' }, { status: 500 })
  }
}
