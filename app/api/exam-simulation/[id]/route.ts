import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener simulacro específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params

    const simulation = await prisma.examSimulation.findUnique({
      where: { id }
    })

    if (!simulation) {
      return NextResponse.json({ error: 'Simulacro no encontrado' }, { status: 404 })
    }

    if (simulation.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(simulation)
  } catch (error) {
    console.error('[Exam Simulation GET] Error:', error)
    return NextResponse.json({ error: 'Error al obtener simulacro' }, { status: 500 })
  }
}
