import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener aula específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params

    const classroom = await prisma.virtualClassroom.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        sessions: {
          orderBy: {
            scheduledAt: 'desc'
          }
        }
      }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Aula no encontrada' }, { status: 404 })
    }

    return NextResponse.json(classroom)
  } catch (error) {
    console.error('[Classroom GET] Error:', error)
    return NextResponse.json({ error: 'Error al obtener aula' }, { status: 500 })
  }
}

// PUT - Actualizar aula
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, password, maxParticipants, active } = body

    const classroom = await prisma.virtualClassroom.update({
      where: { id },
      data: {
        name,
        description,
        password,
        maxParticipants,
        active
      }
    })

    return NextResponse.json(classroom)
  } catch (error) {
    console.error('[Classroom PUT] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar aula' }, { status: 500 })
  }
}

// DELETE - Eliminar aula
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.virtualClassroom.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Classroom DELETE] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar aula' }, { status: 500 })
  }
}
