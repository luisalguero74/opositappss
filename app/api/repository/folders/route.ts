import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRepoFoldersWithDocuments } from '@/lib/repository'
import { prisma } from '@/lib/prisma'
import { reportForbiddenRepositoryAction } from '@/lib/repository-security'

const MAX_SUBFOLDER_DEPTH = 3

async function getFolderDepthFromContainer(folderId: string) {
  // Depth is measured from a top-level container folder (parentId = null)
  // container depth = 0, its child = 1, grandchild = 2, great-grandchild = 3
  let currentId: string | null = folderId
  let depth = 0
  let guard = 0

  while (currentId) {
    guard += 1
    if (guard > 20) {
      throw new Error('Folder depth check exceeded safety limit')
    }

    const parentRow: { parentId: string | null } | null = await prisma.repoFolder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    })

    if (!parentRow) {
      throw new Error('Parent folder not found')
    }

    if (!parentRow.parentId) {
      return depth
    }

    depth += 1
    currentId = parentRow.parentId
  }

  return depth
}

// Endpoint de solo lectura para listar carpetas y documentos del repositorio.
// NOTA: Hasta que las tablas RepoFolder/RepoDocument existan en BD, llamar a
// esta ruta provocará error. No se engancha todavía a la UI en producción.

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String(session.user.role || '').toLowerCase()
    const isAdmin = role === 'admin'
    const repoRole = String(session.user.repoRole || 'NONE').toUpperCase()
    if (!isAdmin && repoRole === 'NONE') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const canManage = isAdmin || repoRole === 'EDITOR'
    // Ensure there is at least one top-level container folder.
    // Only do this for users who can manage the repository.
    if (canManage) {
      const existingContainer = await prisma.repoFolder.findFirst({
        where: { parentId: null },
        select: { id: true },
      })

      if (!existingContainer) {
        await prisma.repoFolder.create({
          data: {
            name: 'Repositorio',
            description: 'Carpeta contenedora',
            parentId: null,
            code: 'repositorio-' + Date.now(),
          },
        })
      }
    }

    const folders = await listRepoFoldersWithDocuments()

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('[Repository Folders] Error:', error)
    return NextResponse.json({ error: 'Error al cargar repositorio' }, { status: 500 })
  }
}

// POST: Crear nueva carpeta (admin/editor)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const role = String(session.user.role || '').toLowerCase()
    const isAdmin = role === 'admin'
    const repoRole = String(session.user.repoRole || 'NONE').toUpperCase()

    const body = await req.json().catch(() => null)
    const name = body?.name
    const description = body?.description
    const parentId = body?.parentId

    if (!isAdmin && repoRole !== 'EDITOR') {
      await reportForbiddenRepositoryAction({
        req,
        session,
        attemptedAction: 'create-folder',
        reason: 'not-editor',
        statusCode: 403,
        details: {
          name: typeof name === 'string' ? name : undefined,
          parentId: typeof parentId === 'string' ? parentId : parentId == null ? null : String(parentId),
        },
      })
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const normalizedParentId = typeof parentId === 'string' && parentId.trim() ? parentId.trim() : null
    if (normalizedParentId) {
      const parent = await prisma.repoFolder.findUnique({
        where: { id: normalizedParentId },
        select: { id: true },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Carpeta padre no encontrada' }, { status: 404 })
      }

      const parentDepth = await getFolderDepthFromContainer(normalizedParentId)
      const newDepth = parentDepth + 1
      if (newDepth > MAX_SUBFOLDER_DEPTH) {
        return NextResponse.json(
          { error: `Máximo ${MAX_SUBFOLDER_DEPTH} niveles de subcarpetas` },
          { status: 400 }
        )
      }
    }

    const folder = await prisma.repoFolder.create({
      data: {
        name,
        description: description || null,
        parentId: normalizedParentId,
        code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now(),
      },
    })
    return NextResponse.json({ folder })
  } catch (error) {
    console.error('[Repository Folders] Error al crear carpeta:', error)
    return NextResponse.json({ error: 'Error al crear carpeta' }, { status: 500 })
  }
}
