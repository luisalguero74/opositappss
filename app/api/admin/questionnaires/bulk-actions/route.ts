import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type BulkAction = 'publish' | 'unpublish' | 'archive'

interface BulkBody {
  ids: string[]
  action: BulkAction
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { ids, action } = (await req.json()) as BulkBody

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No hay cuestionarios seleccionados' }, { status: 400 })
    }

    if (!['publish', 'unpublish', 'archive'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    let data: Record<string, any> = {}

    if (action === 'publish') {
      data = { published: true, archived: false }
    } else if (action === 'unpublish') {
      data = { published: false }
    } else if (action === 'archive') {
      // Archivar también despublica para evitar que aparezca en otros listados
      data = { archived: true, published: false }
    }

    const result = await prisma.questionnaire.updateMany({
      where: {
        id: { in: ids }
      },
      data
    })

    // Registrar en AuditLog una sola entrada agregada (sin depender de que exista siempre)
    try {
      await prisma.auditLog.create({
        data: {
          action: 'BULK_UPDATE',
          entity: 'Questionnaire',
          entityId: null,
          adminId: String(session.user.id),
          adminEmail: String(session.user.email || ''),
          changes: JSON.stringify({ action, ids, data }),
          reason: `Acción masiva desde vista previa de formularios (${action})`
        }
      }).catch(() => {})
    } catch {
      // En caso de error en auditoría, no romper la operación principal
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    })
  } catch (error) {
    console.error('[Bulk Questionnaires] Error:', error)
    return NextResponse.json({ error: 'Error al aplicar acción masiva' }, { status: 500 })
  }
}
