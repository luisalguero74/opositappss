import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { ensureDbSchemaSelfHeal } from '@/lib/db-self-heal'

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

    await ensureDbSchemaSelfHeal()

    // Intentar borrar del filesystem (solo si existe; en Vercel suele no existir)
    const filePath = join(process.cwd(), 'documentos-temario', categoria, fileName)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }

    // Eliminar el registro de la base de datos (y el blob por FK cascade)
    if (temaId) {
      await prisma.temaArchivo.deleteMany({
        where: {
          temaId: temaId,
          nombre: fileName
        }
      })
    } else {
      // Si no se proporciona temaId, intentamos borrar por (categoria + nombre)
      const archivo = await prisma.temaArchivo.findFirst({
        where: { nombre: fileName, tema: { categoria } },
        select: { id: true }
      })

      if (archivo?.id) {
        await prisma.temaArchivo.delete({ where: { id: archivo.id } })
      }
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
