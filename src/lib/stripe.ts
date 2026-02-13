import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY no está configurado en las variables de entorno')
  }

  stripeSingleton = new Stripe(key, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  })

  return stripeSingleton
}

// IDs de los productos en Stripe (se crearán automáticamente si no existen)
export const STRIPE_PLANS = {
  basic: {
    name: 'Plan Basic',
    interval: 'month' as const,
  },
  premium: {
    name: 'Plan Premium',
    interval: 'month' as const,
  },
}
