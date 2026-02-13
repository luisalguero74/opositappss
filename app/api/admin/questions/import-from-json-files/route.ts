import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'
import { readdir } from 'fs/promises'
import { importTemaFromJson } from '../../../../../scripts/import-tema-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
    const limit = Math.max(1, Math.min(5, parseInt(searchParams.get('limit') || '1', 10) || 1))
    const markReviewed = searchParams.get('markReviewed') === 'true'

    const root = process.cwd()
    const entries = await readdir(root)
    const files = entries
      .filter((name) => name.startsWith('TEMA') && name.toLowerCase().endsWith('.json'))
      .sort((a, b) => a.localeCompare(b, 'es'))

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se han encontrado ficheros TEMA*.json en el proyecto.',
        filesProcessed: 0,
        filesTotal: 0,
        offset,
        limit,
        done: true,
        errors: [] as string[],
      })
    }

    const errors: string[] = []
    const perFile: { file: string; created: number; skipped: number }[] = []

    const slice = files.slice(offset, offset + limit)

    for (const file of slice) {
      const fullPath = path.join(root, file)
      try {
        const { created, skipped } = await importTemaFromJson(fullPath, null, { markReviewed })
        perFile.push({ file, created, skipped })
      } catch (err) {
        console.error('[import-from-json-files] Error en', file, err)
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const totalCreated = perFile.reduce((sum, r) => sum + r.created, 0)

    const nextOffset = offset + slice.length
    const done = nextOffset >= files.length

    return NextResponse.json({
      success: errors.length === 0,
      filesProcessed: slice.length,
      filesTotal: files.length,
      offset,
      limit,
      nextOffset,
      done,
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
