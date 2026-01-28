import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'
import { readdir } from 'fs/promises'
import { importTemaFromJson } from '../../../../../scripts/import-tema-json'

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const root = process.cwd()
    const entries = await readdir(root)
    const files = entries.filter((name) => name.startsWith('TEMA') && name.endsWith('.json'))

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se han encontrado ficheros TEMA*.json en el proyecto.',
        filesProcessed: 0,
        errors: [] as string[],
      })
    }

    const errors: string[] = []
    const perFile: { file: string; created: number; skipped: number }[] = []

    for (const file of files) {
      const fullPath = path.join(root, file)
      try {
        const { created, skipped } = await importTemaFromJson(fullPath)
        perFile.push({ file, created, skipped })
      } catch (err) {
        console.error('[import-from-json-files] Error en', file, err)
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const totalCreated = perFile.reduce((sum, r) => sum + r.created, 0)

    return NextResponse.json({
      success: errors.length === 0,
      filesProcessed: files.length,
      totalCreated,
      details: perFile,
      errors,
    })
  } catch (error) {
    console.error('[import-from-json-files] Error general:', error)
    return NextResponse.json(
      {
        error: 'Error al importar preguntas desde JSON del servidor',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
