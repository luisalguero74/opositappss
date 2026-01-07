import { NextRequest, NextResponse } from 'next/server'
import { getSession } from 'next-auth/react'
import { prisma } from '@/lib/prisma'
import { logError, getUnresolvedErrors, getErrorStats, resolveError } from '@/lib/error-logger'

/**
 * GET /api/admin/errors
 * Obtiene lista de errores del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession({ req: request as any })
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verificar que sea admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (String(user?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    // Parámetros de filtro
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const severity = searchParams.get('severity')
    const resolved = searchParams.get('resolved')
    const errorType = searchParams.get('errorType')

    // Construir filtro
    const where: any = {}
    if (severity) where.severity = severity
    if (resolved !== null) where.resolved = resolved === 'true'
    if (errorType) where.errorType = errorType

    // Obtener errores
    const [errors, total] = await Promise.all([
      prisma.systemError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.systemError.count({ where })
    ])

    // Obtener estadísticas
    const stats = await getErrorStats(7)

    return NextResponse.json({
      errors,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      },
      stats
    })
  } catch (error) {
    console.error('[GET_ERRORS_FAILED]', error)
    await logError({
      errorType: 'API_ERROR',
      severity: 'high',
      endpoint: 'GET /api/admin/errors',
      message: 'Failed to fetch errors from database',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch errors' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/errors
 * Marca un error como resuelto
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession({ req: request as any })
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verificar admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (String(user?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { errorId, resolved } = await request.json()

    if (!errorId) {
      return NextResponse.json(
        { error: 'errorId is required' },
        { status: 400 }
      )
    }

    const updatedError = await prisma.systemError.update({
      where: { id: errorId },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? session.user.email : null
      }
    })

    return NextResponse.json({ success: true, error: updatedError })
  } catch (error) {
    console.error('[PATCH_ERROR_FAILED]', error)
    return NextResponse.json(
      { error: 'Failed to update error' },
      { status: 500 }
    )
  }
}
