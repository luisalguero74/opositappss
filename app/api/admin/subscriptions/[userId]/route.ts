import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener suscripción de un usuario
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await context.params

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })

      return NextResponse.json({ subscription })
    } catch (err) {
      // If subscription table isn't available in some env, fail soft.
      console.error('[Subscriptions] GET user subscription failed:', err)
      return NextResponse.json({ subscription: null, unavailable: true })
    }
  } catch (error) {
    console.error('[Subscriptions] Error fetching user subscription:', error)
    return NextResponse.json({ error: 'Error al cargar suscripción' }, { status: 500 })
  }
}

// Actualizar suscripción de un usuario
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await context.params
    const { plan, status, currentPeriodEnd } = await req.json()

    // Buscar suscripción existente
    const existingSub = await prisma.subscription.findUnique({
      where: { userId }
    })

    let subscription
    if (existingSub) {
      subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          plan,
          status,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined
        }
      })
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan,
          status,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined
        }
      })
    }

    console.log(`[Admin] Suscripción actualizada para usuario ${userId}: ${plan} - ${status}`)

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('[Subscriptions] Error updating subscription:', error)
    return NextResponse.json({ error: 'Error al actualizar suscripción' }, { status: 500 })
  }
}
