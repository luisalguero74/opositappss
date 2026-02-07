import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureBoeMonitorTablesExist } from '@/lib/boe-db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  await ensureBoeMonitorTablesExist()

  const [unreadCount, items, lastRun] = await Promise.all([
    prisma.boeAlertItem.count({ where: { isRead: false } }),
    prisma.boeAlertItem.findMany({
      orderBy: [{ isRead: 'asc' }, { publicationDate: 'desc' }, { createdAt: 'desc' }],
      take: 60
    }),
    prisma.boeMonitorRun.findFirst({
      where: { job: 'boe-ss' },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return NextResponse.json({
    unreadCount,
    lastRun: lastRun
      ? {
          createdAt: lastRun.createdAt,
          publicationDate: lastRun.publicationDate,
          success: lastRun.success,
          scannedItems: lastRun.scannedItems,
          matchedItems: lastRun.matchedItems,
          newItems: lastRun.newItems,
          error: lastRun.error
        }
      : null,
    items: items.map(it => ({
      id: it.id,
      publicationDate: it.publicationDate,
      boeId: it.boeId,
      title: it.title,
      urlHtml: it.urlHtml,
      urlPdf: it.urlPdf,
      section: it.section,
      department: it.department,
      epigrafe: it.epigrafe,
      score: it.score,
      reasons: it.reasons,
      isRead: it.isRead,
      createdAt: it.createdAt
    }))
  })
}
