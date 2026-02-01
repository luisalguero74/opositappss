import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function GET() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

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

    const passwordMatch = user.password
      ? await bcrypt.compare('Admin2026!', user.password)
      : false

    return NextResponse.json({
      userExists: true,
      email: user.email,
      role: user.role,
      active: user.active,
      passwordMatch
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
