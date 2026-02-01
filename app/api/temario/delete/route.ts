import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
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
    const fileName = searchParams.get('fileName')
    const temaId = searchParams.get('temaId')

    if (!categoria || !fileName) {
      return NextResponse.json(
        { error: 'Faltan parametros requeridos' },
        { status: 400 }
      )
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'Borrado en disco local no soportado en producción (Vercel). Implementa borrado en almacenamiento remoto (Backblaze B2/Supabase Storage).',
        },
        { status: 501 }
      )
    }

    const { deleteLocalTemarioFile } = await import('@/lib/local-temario-storage')
    const deleted = await deleteLocalTemarioFile(categoria, fileName)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el registro de la base de datos
    if (temaId) {
      await prisma.temaArchivo.deleteMany({
        where: {
          temaId: temaId,
          nombre: fileName
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Archivo eliminado correctamente de disco y base de datos'
    })
  } catch (error) {
    console.error('Error al eliminar archivo:', error)
    return NextResponse.json(
      { error: 'Error al eliminar archivo' },
      { status: 500 }
    )
  }
}
