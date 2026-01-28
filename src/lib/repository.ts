import { prisma } from '@/lib/prisma'

export async function listRepoFoldersWithDocuments() {
  // Esta función está preparada para usarse cuando las tablas RepoFolder/RepoDocument
  // existan en la base de datos (tras aplicar migraciones en un entorno de pruebas y luego en producción).
  // Por ahora NO se usa desde la UI en producción.
  const folders = await prisma.repoFolder.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      documents: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return folders
}

export async function logRepoDocumentAccess(params: {
  documentId: string
  userId?: string | null
  action: 'view' | 'preview' | 'download'
  ipAddress?: string | null
  userAgent?: string | null
}) {
  // Helper para registrar accesos cuando RepoDocumentAccessLog exista en BD.
  const { documentId, userId, action, ipAddress, userAgent } = params

  await prisma.repoDocumentAccessLog.create({
    data: {
      documentId,
      userId: userId || null,
      action,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  })
}
