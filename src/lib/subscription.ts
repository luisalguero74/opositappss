import { prisma } from './prisma'

/**
 * Verifica si un usuario tiene acceso al contenido premium
 * basado en el estado de monetización y su suscripción
 */
export async function checkUserAccess(userId: string): Promise<{
  hasAccess: boolean
  reason: string
  subscription?: any
}> {
  // Get minimal user info first.
  // Do NOT join subscription here: production environments may not have the Subscription table yet.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) {
    return {
      hasAccess: false,
      reason: 'Usuario no encontrado'
    }
  }

  // Los admins siempre tienen acceso
  if (String(user.role || '').toLowerCase() === 'admin') {
    return {
      hasAccess: true,
      reason: 'Acceso de administrador'
    }
  }

  // Verificar si la monetización está activada
  let settings: any = null
  try {
    settings = await prisma.appSettings.findFirst()
  } catch (err) {
    // If settings table/columns drifted in production, fail open (monetization disabled)
    console.error('[Subscription] Error loading AppSettings, allowing access:', err)
    return {
      hasAccess: true,
      reason: 'Monetización no disponible - acceso permitido'
    }
  }
  
  if (!settings || !settings.monetizationEnabled) {
    return {
      hasAccess: true,
      reason: 'Monetización desactivada - acceso gratuito para todos'
    }
  }

  // Verificar período de prueba gratuito
  const userCreatedAt = new Date(user.createdAt)
  const trialEndDate = new Date(userCreatedAt)
  trialEndDate.setDate(trialEndDate.getDate() + settings.freeAccessDays)
  
  const now = new Date()
  const isInTrialPeriod = now <= trialEndDate

  if (isInTrialPeriod) {
    const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      hasAccess: true,
      reason: `Período de prueba - ${daysLeft} día(s) restante(s)`
    }
  }

  // Load subscription only if monetization is enabled and trial is over.
  let subscription: any = null
  try {
    subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    })
  } catch (err) {
    // If subscription system is not deployed yet, fail open (monetization effectively disabled).
    console.error('[Subscription] Error loading Subscription, allowing access:', err)
    return {
      hasAccess: true,
      reason: 'Suscripciones no disponibles - acceso permitido'
    }
  }

  // Verificar suscripción activa
  if (!subscription) {
    return {
      hasAccess: false,
      reason: 'No hay suscripción activa. Periodo de prueba expirado.'
    }
  }

  if (subscription.status !== 'active') {
    return {
      hasAccess: false,
      reason: `Suscripción ${subscription.status}. Se requiere suscripción activa.`
    }
  }

  // Verificar que no haya expirado
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
    return {
      hasAccess: false,
      reason: 'Suscripción expirada. Renueva tu plan para continuar.',
      subscription
    }
  }

  return {
    hasAccess: true,
    reason: `Suscripción ${subscription.plan} activa`,
    subscription
  }
}

/**
 * Middleware para proteger rutas que requieren suscripción
 */
export async function requireSubscription(userId: string) {
  const access = await checkUserAccess(userId)
  
  if (!access.hasAccess) {
    throw new Error(access.reason)
  }
  
  return access
}
