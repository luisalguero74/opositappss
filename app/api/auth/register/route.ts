import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'
import { normalizeSpanishPhone } from '@/lib/phone'
import { ensureDbSchemaSelfHeal } from '@/lib/db-self-heal'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    await ensureDbSchemaSelfHeal()

    console.log('[REGISTER] Starting registration process')
    const { email, phoneNumber, password } = await request.json()
    console.log('[REGISTER] Received data:', { email, phoneNumber: phoneNumber?.substring(0, 5) + '***' })

    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail || !password || !phoneNumber) {
      console.log('[REGISTER] Missing required fields')
      return NextResponse.json({ error: 'Email, teléfono y contraseña son requeridos.' }, { status: 400 })
    }

    const normalized = normalizeSpanishPhone(phoneNumber)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Teléfono inválido. Debe ser español (9 dígitos) con o sin +34.' },
        { status: 400 }
      )
    }

    const phoneToCheck = normalized.canonical
    
    console.log('[REGISTER] Checking phone:', phoneToCheck)
    
    // Verificar que el número está en la lista de permitidos
    const allowedPhone = await prisma.allowedPhoneNumber.findFirst({
      where: {
        OR: normalized.variants.map((v) => ({ phoneNumber: v }))
      }
    })
    console.log('[REGISTER] Allowed phone found:', !!allowedPhone)

    if (!allowedPhone) {
      console.log('[REGISTER] Phone not allowed')
      return NextResponse.json({ 
        error: 'Tu número de teléfono no está autorizado para registrarse. Por favor, envía un correo a alguero2@yahoo.com solicitando acceso.' 
      }, { status: 403 })
    }

    // Check if user already exists
    console.log('[REGISTER] Checking if email exists')
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      },
      select: { id: true }
    })

    if (existingUser) {
      console.log('[REGISTER] Email already exists')
      return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
    }

    // Check if phone number already used (across formats)
    console.log('[REGISTER] Checking if phone exists')
    const existingUsersWithPhone = await prisma.user.findMany({
      where: {
        OR: normalized.variants.map((v) => ({ phoneNumber: v }))
      },
      select: { id: true, email: true, phoneNumber: true }
    })

    const DUPLICATE_PHONE_CANONICAL = '+34656809596'
    const DUPLICATE_PHONE_ALLOWED_EMAILS = new Set([
      'alguero2@yahoo.com',
      'luisalguero74@gmail.com',
      'alguero@yahoo.com'
    ])

    if (existingUsersWithPhone.length > 0) {
      const isAllowedExceptionPhone = phoneToCheck === DUPLICATE_PHONE_CANONICAL
      const isEmailAllowed = DUPLICATE_PHONE_ALLOWED_EMAILS.has(normalizedEmail)
      const allExistingAllowed = existingUsersWithPhone.every((u) =>
        DUPLICATE_PHONE_ALLOWED_EMAILS.has(String(u.email || '').toLowerCase())
      )

      // If it's the special case phone, allow only for whitelisted emails
      if (!(isAllowedExceptionPhone && isEmailAllowed && allExistingAllowed)) {
        console.log('[REGISTER] Phone already exists')
        return NextResponse.json(
          { error: 'Este número de teléfono ya está registrado.' },
          { status: 400 }
        )
      }
    }

    // Hash password
    console.log('[REGISTER] Hashing password')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user + token atomically so partial failures don't leave a user record behind.
    console.log('[REGISTER] Creating user + verification token (transaction)')
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    const now = new Date()

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          phoneNumber: phoneToCheck,
          password: hashedPassword
        }
      })

      await tx.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires
        }
      })

      // Initially mark as not sent; we'll update it after attempting to send.
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO user_registration_meta (
            user_id,
            registration_email_sent,
            registration_email_sent_at,
            updated_at
          ) VALUES (
            ${createdUser.id},
            ${false},
            ${null},
            ${now}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            registration_email_sent = EXCLUDED.registration_email_sent,
            registration_email_sent_at = EXCLUDED.registration_email_sent_at,
            updated_at = EXCLUDED.updated_at;
        `
      )

      return createdUser
    })

    console.log('[REGISTER] User created:', user.id)

    // Try to send verification email (non-blocking)
    console.log('[REGISTER] Sending verification email')
    const emailSent = await sendVerificationEmail(normalizedEmail, token)

    // Persist metadata (without coupling to Prisma schema)
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE user_registration_meta
        SET
          registration_email_sent = ${emailSent},
          registration_email_sent_at = ${emailSent ? now : null},
          updated_at = ${now}
        WHERE user_id = ${user.id};
      `
    )

    console.log('[REGISTER] Registration successful')
    return NextResponse.json({
      message: 'Usuario creado exitosamente. Ya puedes iniciar sesión.',
      emailSent
    })
  } catch (error: unknown) {
    console.error('[REGISTER] Error creating user:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray((error.meta as any)?.target) ? (error.meta as any).target.join(',') : String((error.meta as any)?.target || '')
        if (target.includes('email')) {
          return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
        }
        if (target.includes('phoneNumber')) {
          return NextResponse.json({ error: 'Este número de teléfono ya está registrado.' }, { status: 400 })
        }
      }
    }
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('[REGISTER] Error message:', (error as Error).message)
    }
    if (error && typeof error === 'object' && 'stack' in error) {
      console.error('[REGISTER] Error stack:', (error as Error).stack)
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
