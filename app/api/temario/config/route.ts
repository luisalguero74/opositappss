import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener configuración desde la base de datos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener todos los temas con sus archivos desde la BD
    const temas = await prisma.temaOficial.findMany({
      include: {
        archivos: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    })

    // Convertir a formato compatible con el frontend
    const temasConfig: any = {}
    for (const tema of temas) {
      temasConfig[tema.id] = {
        archivos: tema.archivos.map(a => ({
          nombre: a.nombre,
          numeroPaginas: a.numeroPaginas
        }))
      }
    }

    return NextResponse.json({ temas: temasConfig })
  } catch (error) {
    console.error('Error al leer configuración:', error)
    return NextResponse.json({ temas: {} })
  }
}

// POST - Guardar configuración (no usado, mantenido por compatibilidad)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Ya no necesitamos guardar en archivo JSON, todo está en la BD
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al guardar configuración:', error)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
