import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user && String(session.user.role || '').toLowerCase() !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const to = String(body?.to ?? '').trim()
  if (!to) {
    return NextResponse.json({ error: 'Falta el campo to' }, { status: 400 })
  }

  await sendEmail({
    to,
    subject: 'Test email opositAPPSS (Resend)',
    html: `<p>Hola,</p><p>Este es un correo de prueba de <strong>opositAPPSS</strong>.</p><p>Si lo estás leyendo, el envío funciona.</p>`
  })

  return NextResponse.json({ success: true })
}
