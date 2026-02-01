import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    await prisma.repoFolder.delete({ where: { id } })
    // TODO: Registrar en logs de auditoría
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Repository Folder] Error al borrar:', error)
    return NextResponse.json({ error: 'Error al borrar carpeta' }, { status: 500 })
  }
}
