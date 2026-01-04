import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { published } = await req.json()

    console.log(`[Publish] ID: ${id}, Published: ${published}`)

    const questionnaire = await prisma.questionnaire.update({
      where: { id },
      data: { published }
    })

    console.log(`[Publish] ✓ Cuestionario "${questionnaire.title}" ${published ? 'publicado' : 'despublicado'}`)

    return NextResponse.json({ success: true, questionnaire })
  } catch (error) {
    console.error('[Publish] Error updating questionnaire:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
