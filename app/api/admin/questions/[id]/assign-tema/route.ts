import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { temaId, temaCodigo } = await request.json()

    await prisma.question.update({
      where: { id: params.id },
      data: {
        temaId,
        temaCodigo
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ error: 'Error updating question' }, { status: 500 })
  }
}
