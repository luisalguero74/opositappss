import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function normalizeEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = String(session?.user?.role || '').toLowerCase() === 'admin'
    if (!session?.user?.id || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail((body as any)?.email)

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      },
      update: {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      }
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      subscription
    })
  } catch (error) {
    console.error('[ADMIN GRANT FREE] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
