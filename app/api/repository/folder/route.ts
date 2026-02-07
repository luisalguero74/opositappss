import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { deleteB2Object, getB2RepositoryS3ConfigFromEnv } from '@/lib/external-file'

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key)
}

// PATCH: Editar carpeta (admin/editor)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    const repoRole = String(session?.user?.repoRole || '').toUpperCase()
    const canEdit = role === 'admin' || repoRole === 'EDITOR'
    if (!session?.user || !canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id, name, description } = await req.json()
    if (!id || !name) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 })
    }
    const folder = await prisma.repoFolder.update({
      where: { id },
      data: { name, description: description || null },
    })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ folder })
  } catch (error) {
    console.error('[Repository Folder] Error al editar:', error)
    return NextResponse.json({ error: 'Error al editar carpeta' }, { status: 500 })
  }
}

// DELETE: Borrar carpeta (admin/editor)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    const repoRole = String(session?.user?.repoRole || '').toUpperCase()
    const canEdit = role === 'admin' || repoRole === 'EDITOR'
    if (!session?.user || !canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const target = await prisma.repoFolder.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 })
    }

    const allFolders = await prisma.repoFolder.findMany({
      select: { id: true, parentId: true },
    })

    const childrenByParentId = new Map<string, string[]>()
    for (const f of allFolders) {
      if (!f.parentId) continue
      const arr = childrenByParentId.get(f.parentId) || []
      arr.push(f.id)
      childrenByParentId.set(f.parentId, arr)
    }

    const idsToDelete: string[] = []
    const stack: string[] = [id]
    const seen = new Set<string>()
    let guard = 0

    while (stack.length) {
      guard += 1
      if (guard > 1000) {
        return NextResponse.json({ error: 'Borrado excede el límite de seguridad' }, { status: 400 })
      }

      const current = stack.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      idsToDelete.push(current)

      const children = childrenByParentId.get(current) || []
      for (const childId of children) {
        stack.push(childId)
      }
    }

    const parentById = new Map<string, string | null>()
    for (const f of allFolders) {
      parentById.set(f.id, f.parentId)
    }

    const depthMemo = new Map<string, number>()
    const getDepth = (folderId: string): number => {
      const existing = depthMemo.get(folderId)
      if (existing != null) return existing

      const parentId = parentById.get(folderId) || null
      const d = parentId && seen.has(parentId) ? getDepth(parentId) + 1 : 0
      depthMemo.set(folderId, d)
      return d
    }

    const deleteOrder = [...idsToDelete].sort((a, b) => getDepth(b) - getDepth(a))

    // Delete physical storage objects for all documents in the subtree
    const documents = await prisma.repoDocument.findMany({
      where: { folderId: { in: idsToDelete } },
      select: { id: true, storagePath: true, storageBucket: true },
    })

    const b2Cfg = getB2RepositoryS3ConfigFromEnv()
    const supabase = !b2Cfg ? getSupabaseAdminClient() : null

    for (const doc of documents) {
      const storagePath = String(doc.storagePath || '')
      const storageBucket = doc.storageBucket ? String(doc.storageBucket) : null
      if (!storagePath) {
        return NextResponse.json(
          { error: 'Documento sin storagePath; no se puede borrar la carpeta de forma segura' },
          { status: 400 }
        )
      }

      if (b2Cfg && storageBucket === b2Cfg.bucket) {
        await deleteB2Object(b2Cfg, storagePath)
      } else {
        const bucket = storageBucket || 'repositorio-documentos'
        const client = supabase || getSupabaseAdminClient()
        const { error } = await client.storage.from(bucket).remove([storagePath])
        if (error) {
          return NextResponse.json(
            { error: 'Error al borrar en Supabase Storage: ' + error.message },
            { status: 502 }
          )
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const folderId of deleteOrder) {
        await tx.repoFolder.delete({ where: { id: folderId } })
      }
    })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Repository Folder] Error al borrar:', error)
    return NextResponse.json({ error: 'Error al borrar carpeta' }, { status: 500 })
  }
}
