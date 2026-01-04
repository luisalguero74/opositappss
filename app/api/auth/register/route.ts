import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '../../../../src/lib/prisma'
import { sendVerificationEmail } from '../../../../src/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, phoneNumber, password } = await request.json()

    if (!email || !password || !phoneNumber) {
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
    
    // Verificar que el número está en la lista de permitidos
    const allowedPhone = await prisma.allowedPhone.findFirst({
      where: { 
        OR: [
          { phoneNumber: phoneToCheck },
          { phoneNumber: normalizedPhone },
          { phoneNumber: phoneToCheck.replace('+34', '') }
        ],
        active: true
      }
    })

    if (!allowedPhone) {
      return NextResponse.json({ 
        error: 'Tu número de teléfono no está autorizado para registrarse. Por favor, envía un correo a alguero2@yahoo.com solicitando acceso.' 
      }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado.' }, { status: 400 })
    }

    // Check if phone number already used
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone }
    })

    if (existingPhone) {
      return NextResponse.json({ error: 'Este número de teléfono ya está registrado.' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phoneNumber: phoneToCheck,
        password: hashedPassword
      }
    })

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    })

    // Send verification email
    await sendVerificationEmail(email, token)

    return NextResponse.json({ message: 'Usuario creado exitosamente. Revisa tu email para verificar.' })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
