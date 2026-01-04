import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const temaId = formData.get('temaId') as string
    const categoria = formData.get('categoria') as string

    if (!file || !temaId || !categoria) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'documentos-temario', categoria)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Guardar archivo
    const filePath = join(uploadDir, file.name)
    await writeFile(filePath, buffer)

    // Contar páginas según tipo de archivo
    let numeroPaginas = 0
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'txt') {
      const content = buffer.toString('utf-8')
      const lines = content.split('\n').length
      numeroPaginas = Math.ceil(lines / 50)
    } else if (extension === 'pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buffer)
        numeroPaginas = data.numpages
      } catch (error) {
        console.error('Error al parsear PDF:', error)
        numeroPaginas = 1
      }
    } else if (extension === 'doc' || extension === 'docx') {
      const sizeInKB = buffer.length / 1024
      numeroPaginas = Math.ceil(sizeInKB / 50)
    } else if (extension === 'epub') {
      const sizeInKB = buffer.length / 1024
      numeroPaginas = Math.ceil(sizeInKB / 30)
    } else {
      numeroPaginas = 1
    }

    // Buscar información del tema en TEMARIO_OFICIAL
    const temaInfo = TEMARIO_OFICIAL.find(t => t.id === temaId)
    if (!temaInfo) {
      return NextResponse.json(
        { error: 'Tema no encontrado' },
        { status: 404 }
      )
    }

    // Guardar en base de datos usando upsert para crear o actualizar el tema
    await prisma.temaOficial.upsert({
      where: { id: temaId },
      create: {
        id: temaId,
        numero: temaInfo.numero,
        titulo: temaInfo.titulo,
        descripcion: temaInfo.descripcion,
        categoria: temaInfo.categoria,
        normativaBase: temaInfo.normativaBase ? JSON.stringify(temaInfo.normativaBase) : null
      },
      update: {} // No actualizamos nada si ya existe
    })

    // Verificar si el archivo ya existe para este tema
    const archivoExistente = await prisma.temaArchivo.findFirst({
      where: {
        temaId: temaId,
        nombre: file.name
      }
    })

    if (!archivoExistente) {
      // Crear registro del archivo
      await prisma.temaArchivo.create({
        data: {
          temaId: temaId,
          nombre: file.name,
          numeroPaginas: numeroPaginas
        }
      })
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      numeroPaginas,
      message: 'Archivo subido y guardado en base de datos correctamente'
    })
  } catch (error) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json(
      { error: 'Error al subir archivo' },
      { status: 500 }
    )
  }
}
