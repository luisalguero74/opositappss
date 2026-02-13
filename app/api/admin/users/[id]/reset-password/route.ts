import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDbSchemaSelfHeal } from '@/lib/db-self-heal'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

function generateTemporaryPassword() {
  // 16 chars, URL-safe-ish (no / +)
  return crypto.randomBytes(24).toString('base64url').slice(0, 16)
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchemaSelfHeal()

    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashed = await bcrypt.hash(temporaryPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    })

    const now = new Date()

    let emailSent = false
    try {
      emailSent = await sendEmail({
        to: user.email,
        subject: 'Nueva contraseña temporal (opositAPPSS)',
        html: `
          <p>Se ha generado una nueva contraseña temporal para tu cuenta.</p>
          <p><strong>Contraseña temporal:</strong> ${temporaryPassword}</p>
          <p>Recomendación: inicia sesión y cámbiala cuanto antes.</p>
        `.trim()
      })
    } catch {
      emailSent = false
    }

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO user_registration_meta (
          user_id,
          last_password_reset_at,
          last_password_reset_email_sent,
          last_password_reset_email_sent_at,
          updated_at
        ) VALUES (
          ${user.id},
          ${now},
          ${emailSent},
          ${emailSent ? now : null},
          ${now}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          last_password_reset_at = EXCLUDED.last_password_reset_at,
          last_password_reset_email_sent = EXCLUDED.last_password_reset_email_sent,
          last_password_reset_email_sent_at = EXCLUDED.last_password_reset_email_sent_at,
          updated_at = EXCLUDED.updated_at;
      `
    )

    return NextResponse.json({
      success: true,
      emailSent,
      temporaryPassword
    })
  } catch (error) {
    console.error('[Admin Reset Password] Error:', error)
    return NextResponse.json(
      { error: 'Error al resetear la contraseña' },
      { status: 500 }
    )
  }
}
