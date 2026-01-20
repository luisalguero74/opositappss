import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    console.log(`[Delete] Eliminando cuestionario ID: ${id}`)

    await prisma.questionnaire.delete({
      where: { id }
    })

    console.log(`[Delete] ✓ Cuestionario eliminado exitosamente`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete] Error deleting questionnaire:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

// PUT - Actualizar metadatos de un cuestionario (por ahora: título y parte del temario)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const { title, temaParte } = body as { title?: string; temaParte?: string }

    const data: { title?: string } = {}
    if (typeof title === 'string' && title.trim().length > 0) {
      data.title = title.trim()
    }

    // Actualizar el cuestionario (por ahora solo título)
    const questionnaire = await prisma.questionnaire.update({
      where: { id },
      data
    })

    // Si se ha indicado parte del temario, propagarla a todas las preguntas de este cuestionario
    if (typeof temaParte === 'string' && temaParte.trim().length > 0) {
      const normalized = temaParte.trim().toUpperCase()
      await prisma.question.updateMany({
        where: { questionnaireId: id },
        data: { temaParte: normalized }
      })
    }

    return NextResponse.json({ success: true, questionnaire })
  } catch (error) {
    console.error('[Questionnaire] Error updating questionnaire:', error)
    return NextResponse.json({ error: 'Error al actualizar cuestionario' }, { status: 500 })
  }
}
