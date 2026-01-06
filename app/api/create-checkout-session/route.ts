import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si la monetización está activada
    const settings = await prisma.appSettings.findFirst()
    if (!settings?.monetizationEnabled) {
      return NextResponse.json({ 
        error: 'El sistema de pagos no está disponible actualmente' 
      }, { status: 403 })
    }

    const { plan } = await req.json()
    if (!['basic', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: 'El sistema de pagos no está disponible actualmente' },
        { status: 503 },
      )
    }

    const price = plan === 'basic' ? settings.basicPrice : settings.premiumPrice
    const priceInCents = Math.round(price * 100)

    // Crear producto en Stripe si no existe
    const products = await stripe.products.list({ limit: 100 })
    let product = products.data.find(p => p.metadata.plan === plan)
    
    if (!product) {
      product = await stripe.products.create({
        name: plan === 'basic' ? 'Plan Basic - OpositAPPSS' : 'Plan Premium - OpositAPPSS',
        description: plan === 'basic' 
          ? 'Acceso ilimitado a cuestionarios y estadísticas'
          : 'Todo lo de Basic + simulacros cronometrados y análisis avanzado',
        metadata: { plan }
      })
    }

    // Crear precio en Stripe
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: priceInCents,
      currency: settings.currency.toLowerCase(),
      recurring: { interval: 'month' },
    })

    // Crear sesión de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?payment=cancelled`,
      customer_email: session.user.email!,
      metadata: {
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
        },
      },
    })

    console.log(`[Stripe] Checkout creado para ${session.user.email}: ${plan}`)

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    })
  } catch (error) {
    console.error('[Stripe] Error al crear checkout:', error)
    return NextResponse.json({ 
      error: 'Error al procesar el pago' 
    }, { status: 500 })
  }
}
