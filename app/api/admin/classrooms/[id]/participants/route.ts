import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Agregar participantes al aula
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { userIds, role } = body // userIds: array de IDs de usuarios

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un usuario' }, { status: 400 })
    }

    // Crear participantes
    const participants = await Promise.all(
      userIds.map(userId =>
        prisma.classroomParticipant.upsert({
          where: {
            classroomId_userId: {
              classroomId: id,
              userId
            }
          },
          create: {
            classroomId: id,
            userId,
            role: role || 'student',
            canShareScreen: role === 'moderator'
          },
          update: {
            role: role || 'student',
            canShareScreen: role === 'moderator'
          }
        })
      )
    )

    return NextResponse.json(participants)
  } catch (error) {
    console.error('[Classroom Participants POST] Error:', error)
    return NextResponse.json({ error: 'Error al agregar participantes' }, { status: 500 })
  }
}

// DELETE - Eliminar participante
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    await prisma.classroomParticipant.delete({
      where: {
        classroomId_userId: {
          classroomId: id,
          userId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Classroom Participants DELETE] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar participante' }, { status: 500 })
  }
}
