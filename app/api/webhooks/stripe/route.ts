import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret no configurado' }, { status: 503 })
  }

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[Stripe Webhook] Error al verificar firma:', err)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Evento recibido: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (!userId || !plan) {
          console.error('[Stripe Webhook] Faltan metadatos en la sesión')
          break
        }

        // Crear o actualizar suscripción
        const subscription = session.subscription as string
        const subscriptionDetails = await stripe.subscriptions.retrieve(subscription)
        const periodEnd = (subscriptionDetails as any).current_period_end as number

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: 'active',
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd: false,
          },
          update: {
            plan,
            status: 'active',
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd: false,
          },
        })

        console.log(`[Stripe Webhook] Suscripción activada para usuario ${userId}: ${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.error('[Stripe Webhook] Falta userId en metadata de suscripción')
          break
        }

        const plan = subscription.metadata?.plan || 'basic'
        const periodEnd = (subscription as any).current_period_end as number
        const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end || false

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: subscription.status === 'active' ? 'active' : 'cancelled',
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd,
          },
          update: {
            status: subscription.status === 'active' ? 'active' : 'cancelled',
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd,
          },
        })

        console.log(`[Stripe Webhook] Suscripción actualizada para ${userId}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.error('[Stripe Webhook] Falta userId en metadata de suscripción eliminada')
          break
        }

        await prisma.subscription.update({
          where: { userId },
          data: {
            status: 'cancelled',
            cancelAtPeriodEnd: false,
          },
        })

        console.log(`[Stripe Webhook] Suscripción cancelada para ${userId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof (invoice as any).subscription === 'string' 
          ? (invoice as any).subscription 
          : (invoice as any).subscription?.id

        if (subscriptionId) {
          const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscriptionDetails.metadata?.userId

          if (userId) {
            await prisma.subscription.update({
              where: { userId },
              data: { status: 'expired' },
            })

            console.log(`[Stripe Webhook] Pago falló para ${userId}, suscripción expirada`)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error al procesar evento:', error)
    return NextResponse.json({ error: 'Error al procesar webhook' }, { status: 500 })
  }
}
