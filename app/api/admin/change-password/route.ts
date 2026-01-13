import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcrypt'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidPassword } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Admin-only (this endpoint is meant for changing the admin's own password).
    // Prefer session role, but fallback to DB for robustness.
    let isAdmin = String((session.user as any)?.role || '').toLowerCase() === 'admin'
    if (!isAdmin) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: session.user.email, mode: 'insensitive' } },
        select: { role: true }
      })
      isAdmin = String(dbUser?.role || '').toLowerCase() === 'admin'
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const currentPassword = String(body?.currentPassword ?? '')
    const newPassword = String(body?.newPassword ?? '')

    if (!currentPassword.trim() || !newPassword.trim()) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 }
      )
    }

    const pwdCheck = isValidPassword(newPassword)
    if (!pwdCheck.valid) {
      return NextResponse.json(
        {
          error: 'La contraseña nueva no cumple los requisitos',
          details: pwdCheck.errors
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: session.user.email, mode: 'insensitive' } },
      select: { id: true, password: true, active: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (user.active === false) {
      return NextResponse.json({ error: 'Cuenta desactivada' }, { status: 403 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Este usuario no tiene contraseña configurada' }, { status: 400 })
    }

    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    })

    // Force re-login by invalidating sessions.
    await prisma.session.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Change Password] Error:', error)
    return NextResponse.json({ error: 'Error al cambiar contraseña' }, { status: 500 })
  }
}
