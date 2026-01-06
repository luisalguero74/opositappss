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
  try {
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
    } catch {
      settings = null
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
    const freeAccessDays = typeof settings.freeAccessDays === 'number' ? settings.freeAccessDays : 0
    trialEndDate.setDate(trialEndDate.getDate() + freeAccessDays)
    
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
  } catch (error) {
    console.error('[Subscription] checkUserAccess error (fail-open):', error)
    return {
      hasAccess: true,
      reason: 'Verificación de acceso no disponible - acceso permitido'
    }
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
