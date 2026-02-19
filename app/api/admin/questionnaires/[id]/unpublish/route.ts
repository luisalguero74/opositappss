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

    const questionnaire = await prisma.questionnaire.update({
      where: { id },
      data: { published: false }
    })

    console.log(`[Unpublish] ✓ Cuestionario "${questionnaire.title}" despublicado`)

    return NextResponse.json({ success: true, questionnaire })
  } catch (error) {
    console.error('[Unpublish] Error:', error)
    return NextResponse.json({ error: 'Error al despublicar' }, { status: 500 })
  }
}
