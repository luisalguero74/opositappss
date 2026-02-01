import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Devuelve los últimos 200 logs de acceso a documentos del repositorio, con info de usuario y documento
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const logs = await prisma.repoDocumentAccessLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { email: true } },
        document: { select: { title: true } },
      },
    })

    const result = logs.map((log) => ({
      id: log.id,
      documentId: log.documentId,
      userId: log.userId,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      documentTitle: log.document?.title || null,
      userEmail: log.user?.email || null,
    }))

    return NextResponse.json({ logs: result })
  } catch (error) {
    console.error('[Repo Access Logs Error]:', error)
    return NextResponse.json({ error: 'Error al obtener logs de acceso' }, { status: 500 })
  }
}
