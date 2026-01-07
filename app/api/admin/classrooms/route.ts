import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// GET - Obtener todas las aulas (admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Nota: hay datos legacy con ClassroomParticipant.user = null (FK huérfana).
    // Evitamos incluir la relación user en el listado para que el admin pueda ver/gestionar aulas.
    const classrooms = await prisma.virtualClassroom.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        roomId: true,
        password: true,
        maxParticipants: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
            sessions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(classrooms)
  } catch (error) {
    console.error('[Classrooms GET] Error:', error)
    return NextResponse.json({ error: 'Error al obtener aulas' }, { status: 500 })
  }
}

// POST - Crear nueva aula
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, password, maxParticipants } = body

    const normalizedName = typeof name === 'string' ? name.trim() : ''
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

    if (!normalizedName) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    if (!session.user.email) {
      return NextResponse.json({ error: 'Email no disponible' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: session.user.email,
          mode: 'insensitive'
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Generar roomId único para Jitsi
    const roomId = `opositappss-${uuidv4()}`

    const classroom = await prisma.virtualClassroom.create({
      data: {
        name: normalizedName,
        description: normalizedDescription || null,
        roomId,
        password: normalizedPassword || null,
        maxParticipants: maxParticipantsValue ?? undefined,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    console.log(`[Classrooms] Aula creada: ${name} por ${session.user.email}`)

    return NextResponse.json(classroom)
  } catch (error) {
    console.error('[Classrooms POST] Error:', error)

    const prismaCode =
      error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined
    const details = error instanceof Error ? error.message : undefined

    return NextResponse.json(
      {
        error: 'Error al crear aula',
        code: prismaCode,
        details: process.env.NODE_ENV === 'production' ? undefined : details
      },
      { status: 500 }
    )
  }
}
