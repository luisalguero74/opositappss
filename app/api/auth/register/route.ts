import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '../../../../src/lib/email'
import crypto from 'crypto'

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '').trim()
}

function isTrueEnv(value: string | undefined): boolean {
  return normalizeEnv(value).toLowerCase() === 'true'
}

function parseDateEnv(value: string | undefined): Date | null {
  const raw = normalizeEnv(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isFinite(date.getTime()) ? date : null
}

export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER] Starting registration process')
    const { email, phoneNumber, password } = await request.json()
    console.log('[REGISTER] Received data:', { email, phoneNumber: phoneNumber?.substring(0, 5) + '***' })

    if (!email || !password || !phoneNumber) {
      console.log('[REGISTER] Missing required fields')
      return NextResponse.json({ error: 'Email, teléfono y contraseña son requeridos.' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Normalizar número de teléfono (eliminar espacios y guiones)
    const normalizedPhone = String(phoneNumber).replace(/[\s-]/g, '')
    
    // Validar formato español - aceptar con o sin +34
    const phoneToCheck = normalizedPhone.startsWith('+34') 
      ? normalizedPhone 
      : normalizedPhone.startsWith('34')
      ? '+' + normalizedPhone
      : '+34' + normalizedPhone

    const phoneWithoutCountry = phoneToCheck.replace(/^\+34/, '')
    
    console.log('[REGISTER] Checking phone:', phoneToCheck)
    
    // Verificar que el número está en la lista de permitidos
    const allowedPhone = await prisma.allowedPhoneNumber.findFirst({
      where: { 
        OR: [
          { phoneNumber: phoneToCheck },
          { phoneNumber: normalizedPhone },
          { phoneNumber: phoneWithoutCountry }
        ]
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
    // Hash password
    console.log('[REGISTER] Hashing password')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    console.log('[REGISTER] Creating user')
    const user = await prisma.$transaction(async (tx) => {
      console.log('[REGISTER] Checking if email exists')
      const existingUser = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { id: true },
      })

      if (existingUser) {
        console.log('[REGISTER] Email already exists')
        throw new Error('EMAIL_ALREADY_EXISTS')
      }

      // Check if phone number already used
      console.log('[REGISTER] Checking if phone exists')
      const existingPhone = await tx.user.findFirst({
        where: {
          OR: [
            { phoneNumber: phoneToCheck },
            { phoneNumber: normalizedPhone },
            { phoneNumber: phoneWithoutCountry },
          ],
        },
        select: { id: true },
      })

      if (existingPhone) {
        console.log('[REGISTER] Phone already exists')
        throw new Error('PHONE_ALREADY_EXISTS')
      }

      return tx.user.create({
        data: {
          email: normalizedEmail,
          phoneNumber: phoneToCheck,
          password: hashedPassword,
        },
      })
    })
    console.log('[REGISTER] User created:', user.id)

    // Generate verification token
    console.log('[REGISTER] Creating verification token')
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires
      }
    })

    // Try to send verification email (non-blocking)
    let verificationEmailSent = false
    try {
      console.log('[REGISTER] Sending verification email')
      await sendVerificationEmail(normalizedEmail, token)
      verificationEmailSent = true
    } catch (emailError) {
      console.error('[REGISTER] Error sending verification email:', emailError)
      // Continue without email verification
    }

    console.log('[REGISTER] Registration successful')

    const enforceEnabled = isTrueEnv(process.env.ENFORCE_EMAIL_VERIFICATION)
    const enforceAfter = parseDateEnv(process.env.EMAIL_VERIFICATION_ENFORCE_AFTER)
    const enforcementApplies = enforceEnabled && !!enforceAfter && user.createdAt >= enforceAfter

    if (enforcementApplies) {
      return NextResponse.json({
        message: verificationEmailSent
          ? 'Usuario creado. Revisa tu email para verificar tu cuenta antes de iniciar sesión.'
          : 'Usuario creado. No hemos podido enviar el email de verificación; usa "Reenviar verificación" desde el login.'
      })
    }

    return NextResponse.json({ message: 'Usuario creado exitosamente. Ya puedes iniciar sesión.' })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
      }
      if (error.message === 'PHONE_ALREADY_EXISTS') {
        return NextResponse.json({ error: 'Este número de teléfono ya está registrado.' }, { status: 400 })
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray((error.meta as { target?: unknown } | undefined)?.target)
        ? String(((error.meta as { target?: unknown } | undefined)?.target as unknown[])[0])
        : String((error.meta as { target?: unknown } | undefined)?.target ?? '')

      if (target.includes('email')) {
        return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
      }
      if (target.includes('phoneNumber')) {
        return NextResponse.json({ error: 'Este número de teléfono ya está registrado.' }, { status: 400 })
      }
    }

    console.error('[REGISTER] Error creating user:', error)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('[REGISTER] Error message:', (error as Error).message)
    }
    if (error && typeof error === 'object' && 'stack' in error) {
      console.error('[REGISTER] Error stack:', (error as Error).stack)
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
