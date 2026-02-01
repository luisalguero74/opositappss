import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getB2TemarioS3ConfigFromEnv, listB2Objects } from '@/lib/external-file'

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

    const b2cfg = getB2TemarioS3ConfigFromEnv()
    let files: string[] = []

    if (b2cfg) {
      files = await listB2Objects(b2cfg, `${categoria}/`)
    } else {
      if (process.env.VERCEL) {
        return NextResponse.json(
          {
            error:
              'No hay almacenamiento remoto configurado para temario en producción. Configura Backblaze B2 para temario (B2_TEMARIO_*/B2_TEMARIO_BUCKET) o OPOSITAPP_TEMARIO_REMOTE_BASE_URL.',
          },
          { status: 500 }
        )
      }

      const { listLocalTemarioFiles } = await import('@/lib/local-temario-storage')
      files = await listLocalTemarioFiles(categoria)
    }
    
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
