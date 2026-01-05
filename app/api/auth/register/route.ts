import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '../../../../src/lib/prisma'
import { sendVerificationEmail } from '../../../../src/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER] Starting registration process')
    const { email, phoneNumber, password } = await request.json()
    console.log('[REGISTER] Received data:', { email, phoneNumber: phoneNumber?.substring(0, 5) + '***' })

    if (!email || !password || !phoneNumber) {
      console.log('[REGISTER] Missing required fields')
      return NextResponse.json({ error: 'Email, teléfono y contraseña son requeridos.' }, { status: 400 })
    }

    // Normalizar número de teléfono (eliminar espacios y guiones)
    const normalizedPhone = phoneNumber.replace(/[\s-]/g, '')
    
    // Validar formato español - aceptar con o sin +34
    const phoneToCheck = normalizedPhone.startsWith('+34') 
      ? normalizedPhone 
      : normalizedPhone.startsWith('34')
      ? '+' + normalizedPhone
      : '+34' + normalizedPhone
    
    console.log('[REGISTER] Checking phone:', phoneToCheck)
    
    // TEMPORARILY DISABLED: Phone validation
    // Will re-enable after fixing Prisma Client issue
    /*
    const allowedPhone = await prisma.allowedPhoneNumber.findFirst({
      where: { 
        OR: [
          { phoneNumber: phoneToCheck },
          { phoneNumber: normalizedPhone },
          { phoneNumber: phoneToCheck.replace('+34', '') }
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
    */
    console.log('[REGISTER] Phone validation temporarily disabled')

    // Check if user already exists
    console.log('[REGISTER] Checking if email exists')
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('[REGISTER] Email already exists')
      return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
    }

    // Check if phone number already used
    console.log('[REGISTER] Checking if phone exists')
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone }
    })

    if (existingPhone) {
      console.log('[REGISTER] Phone already exists')
      return NextResponse.json({ error: 'Este número de teléfono ya está registrado.' }, { status: 400 })
    }

    // Hash password
    console.log('[REGISTER] Hashing password')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    console.log('[REGISTER] Creating user')
    const user = await prisma.user.create({
      data: {
        email,
        phoneNumber: phoneToCheck,
        password: hashedPassword
      }
    })
    console.log('[REGISTER] User created:', user.id)

    // Generate verification token
    console.log('[REGISTER] Creating verification token')
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    })

    // Try to send verification email (non-blocking)
    try {
      console.log('[REGISTER] Sending verification email')
      await sendVerificationEmail(email, token)
    } catch (emailError) {
      console.error('[REGISTER] Error sending verification email:', emailError)
      // Continue without email verification
    }

    console.log('[REGISTER] Registration successful')
    return NextResponse.json({ message: 'Usuario creado exitosamente. Ya puedes iniciar sesión.' })
  } catch (error: unknown) {
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
