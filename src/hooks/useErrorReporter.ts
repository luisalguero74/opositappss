/**
 * Hook para reportar errores al sistema de monitoreo
 * Uso:
 * const reportError = useErrorReporter()
 * reportError('API_ERROR', 'Failed to fetch data', 'high', { endpoint: '/api/data' })
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorType = 'API_ERROR' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'EXTERNAL_SERVICE_ERROR' | 'UNKNOWN_ERROR'

export function useErrorReporter() {
  const reportError = async (
    errorType: ErrorType,
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: Record<string, any>
  ) => {
    try {
      // No bloquear la ejecución principal con el reporte de error
      navigator.sendBeacon('/api/admin/log-error', JSON.stringify({
        errorType,
        message,
        severity,
        context,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }))

      // También intentar con fetch para mejor feedback
      fetch('/api/admin/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorType,
          message,
          severity,
          context,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch((err) => {
        console.error('[Error reporter] Failed to report error:', err)
      })
    } catch (err) {
      console.error('[Error reporter] Failed:', err)
    }
  }

  return reportError
}

/**
 * Wrapper para funciones async que captura y reporta errores automáticamente
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorType: ErrorType = 'UNKNOWN_ERROR',
  severity: ErrorSeverity = 'high'
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined

      // Reportar el error
      await fetch('/api/admin/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorType,
          message,
          severity,
          stack,
          context: {
            functionName: fn.name,
            arguments: args
          }
        })
      }).catch((err) => {
        console.error('[Error reporter] Failed to report error:', err)
      })

      // Re-lanzar el error original
      throw error
    }
  }) as T
}

/**
 * Configura global error handler para capturar errores no capturados
 */
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return

  // Capturar errores no manejados
  window.addEventListener('error', (event) => {
    fetch('/api/admin/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorType: 'UNKNOWN_ERROR',
        severity: 'critical',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    }).catch((err) => {
      console.error('[Global error handler] Failed to report error:', err)
    })
  })

  // Capturar promesas rechazadas sin capturar
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    fetch('/api/admin/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorType: 'UNKNOWN_ERROR',
        severity: 'high',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          type: 'unhandledRejection'
        }
      })
    }).catch((err) => {
      console.error('[Unhandled rejection handler] Failed to report error:', err)
    })
  })
}
