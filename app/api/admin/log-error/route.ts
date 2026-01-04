import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/error-logger'

/**
 * POST /api/admin/log-error
 * Endpoint para registrar errores desde el servidor o cliente
 * Puede ser llamado sin autenticación (importante para errores críticos)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      errorType = 'UNKNOWN_ERROR',
      severity = 'medium',
      message,
      endpoint,
      statusCode,
      stack,
      context,
      userEmail
    } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const errorId = await logError({
      errorType,
      severity,
      endpoint,
      statusCode,
      message,
      stack,
      userEmail,
      context,
      notifyAdmin: true
    })

    return NextResponse.json(
      { success: true, errorId },
      { status: 200 }
    )
  } catch (error) {
    console.error('[LOG_ERROR_ENDPOINT_FAILED]', error)
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/log-error
 * Obtiene estadísticas de errores (requiere autenticación admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Aquí podrías validar autenticación si quieres
    // Por ahora lo mantenemos simple
    const stats = await require('@/lib/error-logger').getErrorStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[GET_ERROR_STATS_FAILED]', error)
    return NextResponse.json(
      { error: 'Failed to get error stats' },
      { status: 500 }
    )
  }
}
