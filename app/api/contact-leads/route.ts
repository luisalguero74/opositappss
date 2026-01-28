import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
    }

    const { name, email, phone, note, source } = body as {
      name?: string
      email?: string
      phone?: string
      note?: string
      source?: string
    }

    const trimmedEmail = String(email || '').trim()
    const trimmedPhone = String(phone || '').trim()

    if (!trimmedEmail || !/[^@\s]+@[^@\s]+\.[^@\s]+/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (!trimmedPhone) {
      return NextResponse.json({ error: 'Teléfono obligatorio' }, { status: 400 })
    }

    const normalizedPhone = trimmedPhone.replace(/[^0-9+]/g, '').trim()

    const lead = await prisma.contactLead.create({
      data: {
        name: name ? String(name).trim().slice(0, 200) : undefined,
        email: trimmedEmail.slice(0, 255),
        phone: normalizedPhone.slice(0, 50),
        note: note ? String(note).trim().slice(0, 500) : undefined,
        source: source ? String(source).trim().slice(0, 100) : undefined,
      },
    })

    return NextResponse.json({ success: true, id: lead.id })
  } catch (error) {
    console.error('[ContactLead POST] Error:', error)
    return NextResponse.json({ error: 'Error interno al guardar los datos' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000)

    const leads = await prisma.contactLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: isNaN(limit) ? 200 : limit,
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('[ContactLead GET] Error:', error)
    return NextResponse.json({ error: 'Error al obtener los registros' }, { status: 500 })
  }
}
