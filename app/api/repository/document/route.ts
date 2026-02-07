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

// PATCH: Editar documento (admin/editor)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    const repoRole = String(session?.user?.repoRole || '').toUpperCase()
    const canEdit = role === 'admin' || repoRole === 'EDITOR'
    if (!session?.user || !canEdit) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { id, title, allowDownload } = await req.json()
    if (!id || !title) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 })
    }
    const document = await prisma.repoDocument.update({
      where: { id },
      data: { title, allowDownload: !!allowDownload },
    })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ document })
  } catch (error) {
    console.error('[Repository Document] Error al editar:', error)
    return NextResponse.json({ error: 'Error al editar documento' }, { status: 500 })
  }
}

// DELETE: Borrar documento (admin/editor)
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

    const document = await prisma.repoDocument.findUnique({
      where: { id },
      select: { id: true, storagePath: true, storageBucket: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const storagePath = String(document.storagePath || '')
    const storageBucket = document.storageBucket ? String(document.storageBucket) : null
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Documento sin storagePath; no se puede borrar en almacenamiento' },
        { status: 400 }
      )
    }

    const b2Cfg = getB2RepositoryS3ConfigFromEnv()

    if (b2Cfg && storageBucket === b2Cfg.bucket) {
      await deleteB2Object(b2Cfg, storagePath)
    } else {
      const bucket = storageBucket || 'repositorio-documentos'
      const supabase = getSupabaseAdminClient()
      const { error } = await supabase.storage.from(bucket).remove([storagePath])
      if (error) {
        return NextResponse.json(
          { error: 'Error al borrar en Supabase Storage: ' + error.message },
          { status: 502 }
        )
      }
    }

    await prisma.repoDocument.delete({ where: { id } })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Repository Document] Error al borrar:', error)
    return NextResponse.json({ error: 'Error al borrar documento' }, { status: 500 })
  }
}
