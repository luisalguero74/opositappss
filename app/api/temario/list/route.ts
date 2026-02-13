import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { ensureDbSchemaSelfHeal } from '@/lib/db-self-heal'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const categoria = searchParams.get('categoria')

    if (!categoria) {
      return NextResponse.json(
        { error: 'Falta parametro categoria' },
        { status: 400 }
      )
    }

    // Prefer DB-backed listing (serverless filesystem is ephemeral on Vercel).
    try {
      await ensureDbSchemaSelfHeal()
      const temas = await prisma.temaOficial.findMany({
        where: { categoria },
        include: { archivos: true }
      })

      const archivos = Array.from(
        new Set(
          temas.flatMap(t => t.archivos.map(a => a.nombre)).filter(Boolean)
        )
      )

      if (archivos.length > 0) {
        return NextResponse.json({ archivos })
      }
    } catch {
      // Fall back to FS (useful in local dev)
    }

    // Ruta del directorio
    const dirPath = join(process.cwd(), 'documentos-temario', categoria)

    // Verificar que el directorio existe
    if (!existsSync(dirPath)) {
      return NextResponse.json({ archivos: [] })
    }

    // Leer archivos del directorio
    const files = await readdir(dirPath)
    
    // Filtrar solo archivos (no directorios) y excluir README
    const archivos = files.filter(file => 
      !file.startsWith('.') && 
      file !== 'README.md' &&
      (file.endsWith('.txt') || file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx') || file.endsWith('.epub'))
    )

    return NextResponse.json({ archivos })
  } catch (error) {
    console.error('Error al listar archivos:', error)
    return NextResponse.json(
      { error: 'Error al listar archivos' },
      { status: 500 }
    )
  }
}
