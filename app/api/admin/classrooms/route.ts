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

    const classrooms = await prisma.virtualClassroom.findMany({
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
                name: true,
                email: true
              }
            }
          }
        },
        sessions: {
          where: {
            scheduledAt: {
              gte: new Date()
            }
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        },
        _count: {
          select: {
            participants: true,
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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

    if (!name) {
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
        name,
        description,
        roomId,
        password,
        maxParticipants: maxParticipants || 50,
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
    return NextResponse.json({ error: 'Error al crear aula' }, { status: 500 })
  }
}
