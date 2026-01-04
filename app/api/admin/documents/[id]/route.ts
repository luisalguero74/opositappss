import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Eliminar primero las preguntas relacionadas
    await prisma.generatedQuestion.deleteMany({
      where: { documentId: id }
    })

    // Eliminar las secciones del documento
    await prisma.documentSection.deleteMany({
      where: { documentId: id }
    })

    // Eliminar el documento
    await prisma.legalDocument.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Documents] Error eliminando documento:', error)
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 }
    )
  }
}
