import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener aulas del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        classroomParticipants: {
          where: {
            classroom: {
              active: true
            },
            isBanned: false
          },
          include: {
            classroom: {
              include: {
                sessions: {
                  where: {
                    scheduledAt: {
                      gte: new Date()
                    }
                  },
                  orderBy: {
                    scheduledAt: 'asc'
                  },
                  take: 3
                },
                _count: {
                  select: {
                    participants: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const classrooms = user.classroomParticipants.map(p => ({
      id: p.classroom.id,
      name: p.classroom.name,
      description: p.classroom.description,
      roomId: p.classroom.roomId,
      active: p.classroom.active,
      participant: {
        role: p.role,
        joinedAt: p.joinedAt
      },
      sessions: p.classroom.sessions,
      _count: p.classroom._count
    }))

    return NextResponse.json(classrooms)
  } catch (error) {
    console.error('[User Classrooms] Error:', error)
    return NextResponse.json({ error: 'Error al obtener aulas' }, { status: 500 })
  }
}
