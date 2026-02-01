import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRepoFoldersWithDocuments } from '@/lib/repository'
import { prisma } from '@/lib/prisma'

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

    if (!isAdmin && repoRole !== 'EDITOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { name, description, parentId } = await req.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }
    const folder = await prisma.repoFolder.create({
      data: {
        name,
        description: description || null,
        parentId: parentId || null,
        code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now(),
      },
    })
    return NextResponse.json({ folder })
  } catch (error) {
    console.error('[Repository Folders] Error al crear carpeta:', error)
    return NextResponse.json({ error: 'Error al crear carpeta' }, { status: 500 })
  }
}
