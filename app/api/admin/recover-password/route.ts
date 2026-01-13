import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

import { prisma } from '@/lib/prisma'
import { isValidPassword } from '@/lib/security'

function normalizeSecret(value: string | null | undefined) {
  let v = String(value || '')
    .replace(/\\n/g, '')
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .trim()

  // Accept common formats:
  // - Authorization: Bearer <token>
  // - ADMIN_API_KEY=<token>
  if (/^bearer\s+/i.test(v)) {
    v = v.replace(/^bearer\s+/i, '').trim()
  }

  const envLineMatch = v.match(/^\s*ADMIN_API_KEY\s*=\s*(.+)\s*$/i)
  if (envLineMatch?.[1]) {
    v = envLineMatch[1].trim()
  }

  // Common env formatting: ADMIN_API_KEY="..." or ADMIN_API_KEY='...'
  // Strip a single pair of surrounding quotes (repeat twice to cover nested quoting).
  for (let i = 0; i < 2; i++) {
    if (
      (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
      (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
    ) {
      v = v.slice(1, -1).trim()
    }
  }

  // Remove any remaining whitespace characters (tabs/spaces) from copy/paste.
  // Expected and provided secrets are normalized the same way.
  v = v.replace(/\s+/g, '')

  return v
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function POST(req: NextRequest) {
  try {
    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    if (!expectedApiKey) {
      return NextResponse.json({ error: 'Recuperación no configurada' }, { status: 503 })
    }

    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const apiKeyFromBody = normalizeSecret(body?.apiKey)
    const apiKeyFromHeader = normalizeSecret(req.headers.get('x-api-key'))
    const providedApiKey = apiKeyFromHeader || apiKeyFromBody

    const newPassword = String(body?.newPassword ?? '')
    const confirmNewPassword = String(body?.confirmNewPassword ?? '')

    if (!email || !providedApiKey || !newPassword || !confirmNewPassword) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!timingSafeEqual(providedApiKey, expectedApiKey)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    const pwdCheck = isValidPassword(newPassword)
    if (!pwdCheck.valid) {
      return NextResponse.json(
        { error: 'La contraseña nueva no cumple los requisitos', details: pwdCheck.errors },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (String(user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Solo permitido para administradores' }, { status: 403 })
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    })

    await prisma.session.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Recover Password] Error:', error)
    return NextResponse.json({ error: 'Error al recuperar contraseña' }, { status: 500 })
  }
}
