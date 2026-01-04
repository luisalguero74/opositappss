import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
