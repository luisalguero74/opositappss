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

    const isAdmin = String(session.user.role || '').toLowerCase() === 'admin'

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
        sessions: {
          orderBy: {
            scheduledAt: 'desc'
          }
        },
        _count: {
          select: {
            participants: true,
            sessions: true
          }
        }
      }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Aula no encontrada' }, { status: 404 })
    }

    // Participants pueden tener userId huérfano por datos legacy.
    // Los obtenemos aparte y resolvemos usuarios de forma segura.
    const participantsRaw = await prisma.classroomParticipant.findMany({
      where: { classroomId: id },
      select: {
        id: true,
        userId: true,
        role: true,
        canSpeak: true,
        canShareScreen: true,
        isBanned: true,
        joinedAt: true
      }
    })

    const participantUserIds = Array.from(new Set(participantsRaw.map((p) => p.userId)))
    const users = participantUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: participantUserIds } },
          select: { id: true, name: true, email: true }
        })
      : []
    const userById = new Map(users.map((u) => [u.id, u]))

    const participants = participantsRaw.map((p) => ({
      ...p,
      user: userById.get(p.userId) ?? null
    }))

    // Si no es admin, solo permitir acceso a participantes
    if (!isAdmin) {
      const userEmail = session.user?.email
      if (!userEmail) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

      const user = await prisma.user.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' } },
        select: { id: true }
      })

      if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

      const participant = await prisma.classroomParticipant.findUnique({
        where: { classroomId_userId: { classroomId: id, userId: user.id } },
        select: { isBanned: true }
      })

      if (!participant || participant.isBanned) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }

      // No exponer password a no-admin
      return NextResponse.json({
        ...classroom,
        participants,
        password: null
      })
    }

    return NextResponse.json({
      ...classroom,
      participants
    })
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
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, password, maxParticipants, active } = body

    const normalizedName = typeof name === 'string' ? name.trim() : undefined
    const normalizedDescription = typeof description === 'string' ? description.trim() : undefined
    const normalizedPassword = typeof password === 'string' ? password.trim() : undefined

    let maxParticipantsValue: number | undefined
    if (maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== '') {
      const parsed = typeof maxParticipants === 'number' ? maxParticipants : Number(maxParticipants)
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return NextResponse.json({ error: 'El máximo de participantes debe ser un número entero' }, { status: 400 })
      }
      if (parsed < 1 || parsed > 200) {
        return NextResponse.json({ error: 'El máximo de participantes debe estar entre 1 y 200' }, { status: 400 })
      }
      maxParticipantsValue = parsed
    }

    const classroom = await prisma.virtualClassroom.update({
      where: { id },
      data: {
        name: normalizedName,
        description: normalizedDescription || null,
        password: normalizedPassword || null,
        maxParticipants: maxParticipantsValue,
        active: typeof active === 'boolean' ? active : undefined
      }
    })

    return NextResponse.json(classroom)
  } catch (error) {
    console.error('[Classroom PUT] Error:', error)

    const prismaCode =
      error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined
    const details = error instanceof Error ? error.message : undefined

    return NextResponse.json(
      {
        error: 'Error al actualizar aula',
        code: prismaCode,
        details: process.env.NODE_ENV === 'production' ? undefined : details
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar aula
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

    await prisma.virtualClassroom.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Classroom DELETE] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar aula' }, { status: 500 })
  }
}
