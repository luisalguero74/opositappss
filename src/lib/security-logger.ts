/**
 * Sistema de Logging de Seguridad
 * 
 * Registra eventos de seguridad importantes para auditoría
 */

import fs from 'fs'
import path from 'path'

export enum SecurityEventType {
  // Autenticación
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  
  // Autorización
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Ataques potenciales
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  
  // Datos sensibles
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  
  // Sistema
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface SecurityEvent {
  timestamp: Date
  type: SecurityEventType
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  path?: string
  method?: string
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class SecurityLogger {
  private logsDir: string
  private disabled: boolean

  constructor() {
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd()
    this.logsDir = path.join(baseDir, 'logs', 'security')
    this.disabled = false

    try {
      this.ensureLogsDirectory()
    } catch (error) {
      this.disabled = true
      console.error('[SecurityLogger] Disabled (cannot initialize log dir):', error)
    }
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true })
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]
    return path.join(this.logsDir, `security-${date}.log`)
  }

  /**
   * Registra un evento de seguridad
   */
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    }

    const logEntry = JSON.stringify(fullEvent) + '\n'
    const logFile = this.getLogFilePath()

    try {
      if (!this.disabled) {
        fs.appendFileSync(logFile, logEntry, 'utf8')
      }
    } catch (error) {
      this.disabled = true
      console.error('[SecurityLogger] Error writing security log (disabling):', error)
    } finally {
      // En serverless es útil que eventos críticos se vean siempre en logs
      if (event.severity === 'critical') {
        console.error('CRITICAL SECURITY EVENT:', fullEvent)
      }
    }
  }

  /**
   * Login exitoso
   */
  logLoginSuccess(userId: string, userEmail: string, ip?: string) {
    this.log({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId,
      userEmail,
      ip,
      severity: 'low',
    })
  }

  /**
   * Login fallido
   */
  logLoginFailed(email: string, ip?: string, reason?: string) {
    this.log({
      type: SecurityEventType.LOGIN_FAILED,
      userEmail: email,
      ip,
      details: { reason },
      severity: 'medium',
    })
  }

  /**
   * Acceso no autorizado
   */
  logUnauthorizedAccess(path: string, userId?: string, ip?: string) {
    this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      userId,
      path,
      ip,
      severity: 'high',
    })
  }

  /**
   * Acceso de administrador
   */
  logAdminAccess(userId: string, path: string, action: string, ip?: string) {
    this.log({
      type: SecurityEventType.ADMIN_ACCESS,
      userId,
      path,
      ip,
      details: { action },
      severity: 'medium',
    })
  }

  /**
   * Rate limit excedido
   */
  logRateLimitExceeded(ip: string, path: string) {
    this.log({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip,
      path,
      severity: 'medium',
    })
  }

  /**
   * Intento de SQL injection
   */
  logSqlInjectionAttempt(ip: string, path: string, payload: string) {
    this.log({
      type: SecurityEventType.SQL_INJECTION_ATTEMPT,
      ip,
      path,
      details: { payload: payload.slice(0, 200) }, // Limitar longitud
      severity: 'critical',
    })
  }

  /**
   * Intento de XSS
   */
  logXssAttempt(ip: string, path: string, payload: string) {
    this.log({
      type: SecurityEventType.XSS_ATTEMPT,
      ip,
      path,
      details: { payload: payload.slice(0, 200) },
      severity: 'high',
    })
  }

  /**
   * Violación CSRF
   */
  logCsrfViolation(userId?: string, ip?: string) {
    this.log({
      type: SecurityEventType.CSRF_VIOLATION,
      userId,
      ip,
      severity: 'high',
    })
  }

  /**
   * Exportación de datos
   */
  logDataExport(userId: string, dataType: string, recordCount: number) {
    this.log({
      type: SecurityEventType.DATA_EXPORT,
      userId,
      details: { dataType, recordCount },
      severity: 'medium',
    })
  }

  /**
   * Eliminación de datos
   */
  logDataDeletion(userId: string, dataType: string, recordId: string) {
    this.log({
      type: SecurityEventType.DATA_DELETION,
      userId,
      details: { dataType, recordId },
      severity: 'high',
    })
  }

  /**
   * Cambio de contraseña
   */
  logPasswordChanged(userId: string, ip?: string) {
    this.log({
      type: SecurityEventType.PASSWORD_CHANGED,
      userId,
      ip,
      severity: 'medium',
    })
  }

  /**
   * Cambio de rol
   */
  logRoleChanged(adminId: string, targetUserId: string, oldRole: string, newRole: string) {
    this.log({
      type: SecurityEventType.ROLE_CHANGED,
      userId: adminId,
      details: { targetUserId, oldRole, newRole },
      severity: 'high',
    })
  }

  /**
   * Error de API
   */
  logApiError(path: string, method: string, error: string, userId?: string) {
    this.log({
      type: SecurityEventType.API_ERROR,
      userId,
      path,
      method,
      details: { error },
      severity: 'medium',
    })
  }

  /**
   * Lee los logs de seguridad de un día específico
   */
  readLogs(date?: string): SecurityEvent[] {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const logFile = path.join(this.logsDir, `security-${targetDate}.log`)

    try {
      if (!fs.existsSync(logFile)) {
        return []
      }

      const content = fs.readFileSync(logFile, 'utf8')
      const lines = content.trim().split('\n').filter(line => line.length > 0)
      
      return lines.map(line => JSON.parse(line) as SecurityEvent)
    } catch (error) {
      console.error('Error reading security logs:', error)
      return []
    }
  }

  /**
   * Obtiene estadísticas de seguridad de un día
   */
  getStats(date?: string): {
    total: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    criticalEvents: SecurityEvent[]
  } {
    const events = this.readLogs(date)
    
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const criticalEvents: SecurityEvent[] = []

    events.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1
      
      if (event.severity === 'critical') {
        criticalEvents.push(event)
      }
    })

    return {
      total: events.length,
      byType,
      bySeverity,
      criticalEvents,
    }
  }

  /**
   * Detecta patrones sospechosos
   */
  detectSuspiciousActivity(hours: number = 24): {
    suspiciousIps: string[]
    multipleFailedLogins: Array<{ email: string; count: number }>
    frequentRateLimits: string[]
  } {
    // Esto requeriría leer múltiples archivos de log
    // Por ahora retornamos estructura vacía
    return {
      suspiciousIps: [],
      multipleFailedLogins: [],
      frequentRateLimits: [],
    }
  }
}

// Exportar instancia singleton
export const securityLogger = new SecurityLogger()

// Helper para obtener IP del request
export function getClientIp(request: Request | any): string {
  return (
    request?.headers?.get?.('x-forwarded-for')?.split(',')[0] ||
    request?.headers?.get?.('x-real-ip') ||
    request?.ip ||
    'unknown'
  )
}

// Helper para obtener user agent
export function getUserAgent(request: Request | any): string {
  return request.headers?.get?.('user-agent') || 'unknown'
}
