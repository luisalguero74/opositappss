import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }

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
