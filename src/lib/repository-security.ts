import type { NextRequest } from 'next/server'

import { logError } from '@/lib/error-logger'
import { securityLogger } from '@/lib/security-logger'

function getClientIp(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent') || null
}

function isAdminFromSession(session: any): boolean {
  const role = String(session?.user?.role || '').toLowerCase()
  return role === 'admin'
}

function getRepoRoleFromSession(session: any): string {
  return String(session?.user?.repoRole || 'NONE').toUpperCase()
}

export async function reportForbiddenRepositoryAction(params: {
  req: NextRequest
  session: any
  attemptedAction: string
  reason: string
  statusCode?: number
  details?: Record<string, any>
}) {
  const { req, session, attemptedAction, reason, statusCode = 403, details } = params

  if (!session?.user) return
  if (isAdminFromSession(session)) return

  const repoRole = getRepoRoleFromSession(session)
  // Avisamos especialmente si un usuario con rol lector/sin rol intenta acciones prohibidas.
  const shouldNotify = repoRole === 'READER' || repoRole === 'NONE'

  const endpoint = req.nextUrl.pathname
  const ip = getClientIp(req)
  const userAgent = getUserAgent(req)

  securityLogger.logUnauthorizedAccess(endpoint, session.user.id, ip || undefined)

  await logError({
    errorType: 'AUTH_ERROR',
    severity: shouldNotify ? 'high' : 'medium',
    endpoint,
    statusCode,
    message: `Repository forbidden action: ${attemptedAction} (${reason})`,
    userEmail: session.user.email,
    userId: session.user.id,
    context: {
      attemptedAction,
      reason,
      repoRole,
      role: String(session.user.role || ''),
      ip,
      userAgent,
      ...(details ? { details } : {}),
    },
    notifyAdmin: shouldNotify,
  })
}
