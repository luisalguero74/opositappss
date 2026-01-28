import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logRepoDocumentAccess } from '@/lib/repository'

// IMPORTANTE: esta ruta asumirá que las tablas del repositorio existen en BD.
// Hasta que no se apliquen migraciones en un entorno seguro, no debe usarse
// desde la UI de producción.

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const { documentId, action } = await req.json()

    if (!documentId || !action) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    if (!['view', 'preview', 'download'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = req.headers.get('user-agent') || null

    await logRepoDocumentAccess({
      documentId,
      userId,
      action,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Repository Access Log] Error:', error)
    return NextResponse.json({ error: 'Error al registrar acceso' }, { status: 500 })
  }
}
