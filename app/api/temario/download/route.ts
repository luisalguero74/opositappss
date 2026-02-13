import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
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
    const fileName = searchParams.get('fileName')

    if (!categoria || !fileName) {
      return NextResponse.json(
        { error: 'Faltan parametros requeridos' },
        { status: 400 }
      )
    }

    // Try DB first (Vercel serverless).
    try {
      await ensureDbSchemaSelfHeal()

      const archivo = await prisma.temaArchivo.findFirst({
        where: {
          nombre: fileName,
          tema: { categoria }
        },
        select: { id: true }
      })

      if (archivo?.id) {
        const rows = await prisma.$queryRaw<
          { data_base64: string; mime_type: string | null }[]
        >`SELECT data_base64, mime_type FROM tema_archivo_blobs WHERE tema_archivo_id = ${archivo.id} LIMIT 1`

        const row = rows?.[0]
        if (row?.data_base64) {
          const fileBuffer = Buffer.from(row.data_base64, 'base64')
          const contentType = row.mime_type || 'application/octet-stream'

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
              'Content-Length': fileBuffer.length.toString(),
            },
          })
        }
      }
    } catch {
      // fall back to filesystem
    }

    // Construir ruta del archivo
    const filePath = join(process.cwd(), 'documentos-temario', categoria, fileName)

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    // Leer el archivo
    const fileBuffer = await readFile(filePath)

    // Determinar el tipo MIME segun la extension
    const extension = fileName.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'txt':
        contentType = 'text/plain; charset=utf-8'
        break
      case 'doc':
        contentType = 'application/msword'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
      case 'epub':
        contentType = 'application/epub+zip'
        break
    }

    // Devolver el archivo con headers apropiados
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error al descargar archivo:', error)
    return NextResponse.json(
      { error: 'Error al descargar archivo' },
      { status: 500 }
    )
  }
}
