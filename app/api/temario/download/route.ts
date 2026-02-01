import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  buildRemoteTemarioUrl,
  proxyRemoteFile,
  getB2TemarioS3ConfigFromEnv,
  presignB2GetObjectUrl,
} from '@/lib/external-file'

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

    // Construir ruta del archivo
    const remoteBaseUrl = process.env.OPOSITAPP_TEMARIO_REMOTE_BASE_URL
    if (remoteBaseUrl) {
      const url = buildRemoteTemarioUrl(remoteBaseUrl, categoria, fileName)
      return await proxyRemoteFile({ url, fileName })
    }

    const b2cfg = getB2TemarioS3ConfigFromEnv()
    if (b2cfg) {
      const key = `${categoria}/${fileName}`
      const signedUrl = await presignB2GetObjectUrl(b2cfg, key, 60)
      return await proxyRemoteFile({ url: signedUrl, fileName })
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'No hay almacenamiento remoto configurado para temario en producción. Configura Backblaze B2 para temario (B2_TEMARIO_*/B2_TEMARIO_BUCKET) o OPOSITAPP_TEMARIO_REMOTE_BASE_URL.',
        },
        { status: 500 }
      )
    }

    const { readLocalTemarioFile } = await import('@/lib/local-temario-storage')
    const local = await readLocalTemarioFile(categoria, fileName)
    if (!local) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    const body = new Uint8Array(local.buffer)

    return new NextResponse(body, {
      headers: {
        'Content-Type': local.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': body.byteLength.toString(),
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
