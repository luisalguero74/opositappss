import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listRepoFoldersWithDocuments } from '@/lib/repository'

// Endpoint de solo lectura para listar carpetas y documentos del repositorio.
// NOTA: Hasta que las tablas RepoFolder/RepoDocument existan en BD, llamar a
// esta ruta provocará error. No se engancha todavía a la UI en producción.

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const folders = await listRepoFoldersWithDocuments()

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('[Repository Folders] Error:', error)
    return NextResponse.json({ error: 'Error al cargar repositorio' }, { status: 500 })
  }
}
