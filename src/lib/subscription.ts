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
  // Obtener usuario primero para verificar si es admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })

  if (!user) {
    return {
      hasAccess: false,
      reason: 'Usuario no encontrado'
    }
  }

  // Los admins siempre tienen acceso
  if (user.role === 'ADMIN') {
    return {
      hasAccess: true,
      reason: 'Acceso de administrador'
    }
  }

  // Verificar si la monetización está activada
  const settings = await prisma.appSettings.findFirst()
  
  if (!settings || !settings.monetizationEnabled) {
    return {
      hasAccess: true,
      reason: 'Monetización desactivada - acceso gratuito para todos'
    }
  }

  if (!user) {
    return {
      hasAccess: false,
      reason: 'Usuario no encontrado'
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
      reason: `Período de prueba - ${daysLeft} día(s) restante(s)`,
      subscription: user.subscription
    }
  }

  // Verificar suscripción activa
  if (!user.subscription) {
    return {
      hasAccess: false,
      reason: 'No hay suscripción activa. Periodo de prueba expirado.'
    }
  }

  if (user.subscription.status !== 'active') {
    return {
      hasAccess: false,
      reason: `Suscripción ${user.subscription.status}. Se requiere suscripción activa.`
    }
  }

  // Verificar que no haya expirado
  if (user.subscription.currentPeriodEnd && new Date(user.subscription.currentPeriodEnd) < now) {
    return {
      hasAccess: false,
      reason: 'Suscripción expirada. Renueva tu plan para continuar.',
      subscription: user.subscription
    }
  }

  return {
    hasAccess: true,
    reason: `Suscripción ${user.subscription.plan} activa`,
    subscription: user.subscription
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
