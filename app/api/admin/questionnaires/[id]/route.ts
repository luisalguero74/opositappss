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
