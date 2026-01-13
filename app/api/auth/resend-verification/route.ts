import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

function normalizeEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail((body as any)?.email)

    // Response is intentionally generic to avoid user enumeration.
    const okResponse = NextResponse.json({ message: 'Si el email existe, hemos enviado un enlace de verificación.' })

    if (!email) return okResponse

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, active: true, emailVerified: true },
    })

    if (!user) return okResponse
    if (user.active === false) return okResponse
    if (user.emailVerified) return okResponse

    // Replace any existing tokens for this identifier.
    await prisma.verificationToken.deleteMany({ where: { identifier: user.email } })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    })

    try {
      await sendVerificationEmail(user.email, token)
    } catch (error) {
      console.error('[RESEND VERIFICATION] Error sending email:', error)
      // Do not reveal failure details.
    }

    return okResponse
  } catch (error) {
    console.error('[RESEND VERIFICATION] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
