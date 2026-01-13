import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { duration, questionsAnswered, type } = await req.json()

    const session_record = await prisma.studySession.create({
      data: {
        userId: user.id,
        duration,
        questionsAnswered,
        type
      }
    })

    return NextResponse.json({ session: session_record })

  } catch (error) {
    console.error('[Study Session] Error:', error)
    return NextResponse.json({ 
      error: 'Error al registrar sesión'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const sessions = await prisma.studySession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 30
    })

    return NextResponse.json({ sessions })

  } catch (error) {
    console.error('[Study Sessions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener sesiones'
    }, { status: 500 })
  }
}
