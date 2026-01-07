import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

function generateTemporaryPassword(length: number = 14) {
  // base64url: [A-Za-z0-9-_]
  const raw = crypto.randomBytes(Math.ceil((length * 3) / 4)).toString('base64url')
  return raw.slice(0, length)
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Protección explícita: no permitir resetear contraseñas de admins
    if (String(user.role || '').toLowerCase() === 'admin') {
      return NextResponse.json(
        { error: 'No se permite resetear la contraseña de un administrador' },
        { status: 400 }
      )
    }

    const newPassword = generateTemporaryPassword(14)
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    console.log(`[Admin] Password reset for user ${user.email}`)

    // Se devuelve solo al admin para comunicarla al usuario. (No se guarda en logs)
    return NextResponse.json({ success: true, userId: user.id, email: user.email, newPassword })
  } catch (error) {
    console.error('[Admin Reset Password] Error:', error)
    return NextResponse.json({ error: 'Error al resetear contraseña' }, { status: 500 })
  }
}
