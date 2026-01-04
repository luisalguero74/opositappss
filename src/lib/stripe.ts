import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurado en las variables de entorno')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

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
