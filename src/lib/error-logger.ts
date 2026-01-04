import { prisma } from './prisma'
import { sendEmail } from './email'

interface ErrorLogOptions {
  errorType: 'API_ERROR' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'EXTERNAL_SERVICE_ERROR' | 'UNKNOWN_ERROR'
  severity: 'low' | 'medium' | 'high' | 'critical'
  endpoint?: string
  statusCode?: number
  message: string
  stack?: string
  userEmail?: string
  userId?: string
  context?: Record<string, any>
  notifyAdmin?: boolean // Si true, envía email al admin
}

const ADMIN_EMAILS = process.env.ADMIN_ERROR_EMAILS?.split(',') || ['alguero2@yahoo.com']
const LOG_DIR = './logs'

/**
 * Logger centralizado de errores del sistema
 * Registra errores en BD y opcionalmente notifica al admin
 */
export async function logError(options: ErrorLogOptions) {
  try {
    const {
      errorType,
      severity,
      endpoint,
      statusCode,
      message,
      stack,
      userEmail,
      userId,
      context,
      notifyAdmin = severity === 'critical' || severity === 'high'
    } = options

    // Registrar en BD
    const error = await prisma.systemError.create({
      data: {
        errorType,
        severity,
        endpoint,
        statusCode,
        message,
        stack: stack?.substring(0, 2000), // Limitar tamaño del stack
        userEmail,
        userId,
        context: context ? JSON.stringify(context) : null,
      },
    })

    // Log en consola
    console.error(`[${errorType}] [${severity.toUpperCase()}] ${message}`, {
      endpoint,
      statusCode,
      userEmail,
      userId,
      context
    })

    // Notificar al admin si aplica
    if (notifyAdmin && ADMIN_EMAILS.length > 0) {
      await notifyAdminOfError(error, message, severity, endpoint)
    }

    return error.id
  } catch (err) {
    // Fallback: al menos loguear en consola si falla registrar en BD
    console.error('[ERROR_LOGGER_FAILED]', err)
  }
}

/**
 * Envía notificación por email al administrador sobre errores críticos
 */
async function notifyAdminOfError(
  error: any,
  message: string,
  severity: string,
  endpoint?: string
) {
  try {
    const severityEmoji = {
      low: '⚠️',
      medium: '⚠️⚠️',
      high: '🔴',
      critical: '🔴🔴'
    }[severity] || '⚠️'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>${severityEmoji} ${severity.toUpperCase()}: Error en opositAPPSS</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Tipo de Error:</strong> ${error.errorType}</p>
          <p><strong>Mensaje:</strong> ${message}</p>
          ${endpoint ? `<p><strong>Endpoint:</strong> ${endpoint}</p>` : ''}
          ${error.statusCode ? `<p><strong>Status Code:</strong> ${error.statusCode}</p>` : ''}
          ${error.userEmail ? `<p><strong>Usuario Afectado:</strong> ${error.userEmail}</p>` : ''}
          <p><strong>Timestamp:</strong> ${new Date(error.createdAt).toLocaleString('es-ES')}</p>
        </div>

        ${error.stack ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <strong>Stack Trace:</strong>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">
${error.stack.substring(0, 1500)}
            </pre>
          </div>
        ` : ''}

        ${error.context ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2196F3;">
            <strong>Contexto:</strong>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">
${error.context.substring(0, 1000)}
            </pre>
          </div>
        ` : ''}

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            <strong>ID de Error:</strong> ${error.id}
          </p>
          <p style="font-size: 12px; color: #666;">
            Revisa el dashboard de errores en: 
            <a href="${process.env.NEXTAUTH_URL}/admin/error-monitoring">Panel de Monitoreo</a>
          </p>
        </div>
      </div>
    `

    for (const adminEmail of ADMIN_EMAILS) {
      await sendEmail({
        to: adminEmail.trim(),
        subject: `${severityEmoji} [${severity.toUpperCase()}] Error en opositAPPSS - ${error.errorType}`,
        html
      }).catch((err) => {
        console.error(`[EMAIL_NOTIFICATION_FAILED] No se pudo enviar notificación a ${adminEmail}:`, err)
      })
    }
  } catch (err) {
    console.error('[ADMIN_NOTIFICATION_FAILED]', err)
  }
}

/**
 * Actualiza estado de error (marcar como resuelto)
 */
export async function resolveError(errorId: string, resolvedBy: string) {
  try {
    return await prisma.systemError.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy
      }
    })
  } catch (err) {
    console.error('[RESOLVE_ERROR_FAILED]', err)
  }
}

/**
 * Obtiene errores sin resolver (para dashboard)
 */
export async function getUnresolvedErrors(limit = 50) {
  try {
    return await prisma.systemError.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  } catch (err) {
    console.error('[GET_ERRORS_FAILED]', err)
    return []
  }
}

/**
 * Obtiene estadísticas de errores
 */
export async function getErrorStats(days = 7) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const errors = await prisma.systemError.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    })

    const byType = {} as Record<string, number>
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 }
    let totalErrors = errors.length
    let unresolvedCount = 0

    errors.forEach(err => {
      byType[err.errorType] = (byType[err.errorType] || 0) + 1
      bySeverity[err.severity as keyof typeof bySeverity]++
      if (!err.resolved) unresolvedCount++
    })

    return {
      totalErrors,
      unresolvedCount,
      byType,
      bySeverity,
      timeRange: `${days} días`
    }
  } catch (err) {
    console.error('[GET_STATS_FAILED]', err)
    return { totalErrors: 0, unresolvedCount: 0, byType: {}, bySeverity: {}, timeRange: '0 días' }
  }
}
