import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const BIBLIOTECA_PATH = join(process.cwd(), 'data', 'biblioteca-legal.json')

async function loadBiblioteca() {
  if (!existsSync(BIBLIOTECA_PATH)) {
    return { documentos: [], relaciones: {} }
  }
  const data = await readFile(BIBLIOTECA_PATH, 'utf-8')
  return JSON.parse(data)
}

async function saveBiblioteca(data: any) {
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true })
  }
  await writeFile(BIBLIOTECA_PATH, JSON.stringify(data, null, 2))
}

// GET - Obtener biblioteca completa o por tema
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const temaId = searchParams.get('temaId')

    const biblioteca = await loadBiblioteca()

    if (temaId) {
      // Devolver solo los documentos asociados a este tema
      const documentosIds = biblioteca.relaciones[temaId] || []
      const documentos = biblioteca.documentos.filter((doc: any) => 
        documentosIds.includes(doc.id)
      )
      return NextResponse.json({ documentos })
    }

    return NextResponse.json(biblioteca)
  } catch (error) {
    console.error('Error al leer biblioteca:', error)
    return NextResponse.json({ documentos: [], relaciones: {} })
  }
}

// POST - Agregar documento a la biblioteca
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const biblioteca = await loadBiblioteca()

    if (body.action === 'add-documento') {
      // Agregar nuevo documento
      const nuevoDoc = {
        id: body.id || `doc_${Date.now()}`,
        nombre: body.nombre,
        archivo: body.archivo,
        tipo: body.tipo,
        numeroPaginas: body.numeroPaginas,
        fechaActualizacion: body.fechaActualizacion || new Date().toISOString().split('T')[0]
      }
      biblioteca.documentos.push(nuevoDoc)
      await saveBiblioteca(biblioteca)
      return NextResponse.json({ success: true, documento: nuevoDoc })
    }

    if (body.action === 'asociar-tema') {
      // Asociar documentos a un tema
      const { temaId, documentosIds } = body
      biblioteca.relaciones[temaId] = documentosIds
      await saveBiblioteca(biblioteca)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'delete-documento') {
      // Eliminar documento
      biblioteca.documentos = biblioteca.documentos.filter((doc: any) => doc.id !== body.id)
      // Limpiar relaciones
      Object.keys(biblioteca.relaciones).forEach(temaId => {
        biblioteca.relaciones[temaId] = biblioteca.relaciones[temaId].filter(
          (docId: string) => docId !== body.id
        )
      })
      await saveBiblioteca(biblioteca)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar biblioteca:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
