import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const submittedPassword = String(body?.password ?? '')

    if (!submittedPassword.trim()) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    const classroom = await prisma.virtualClassroom.findUnique({
      where: { id },
      select: { id: true, password: true }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Aula no encontrada' }, { status: 404 })
    }

    // Si no tiene password, no bloqueamos el acceso.
    if (!classroom.password) {
      return NextResponse.json({ ok: true })
    }

    const isAdmin = String(session.user.role || '').toLowerCase() === 'admin'
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
    }

    const ok = submittedPassword === classroom.password
    if (!ok) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 403 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Classroom Verify Password] Error:', error)
    return NextResponse.json({ error: 'Error verificando contraseña' }, { status: 500 })
  }
}
