import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido.' }, { status: 400 })
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 400 })
    }

    // Update user emailVerified
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    })

    // Delete token
    await prisma.verificationToken.delete({
      where: { token }
    })

    return NextResponse.redirect(new URL('/login?verified=true', request.url))
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}