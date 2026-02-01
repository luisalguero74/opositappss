import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    await prisma.repoDocument.delete({ where: { id } })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Repository Document] Error al borrar:', error)
    return NextResponse.json({ error: 'Error al borrar documento' }, { status: 500 })
  }
}
