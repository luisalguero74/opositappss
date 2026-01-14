import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'alguero2@yahoo.com' }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado',
        email: 'alguero2@yahoo.com'
      })
    }

    const passwordMatch = await bcrypt.compare('Admin2026!', user.password)

    return NextResponse.json({
      userExists: true,
      email: user.email,
      role: user.role,
      active: user.active,
      passwordMatch,
      passwordHashStart: user.password.substring(0, 20)
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
