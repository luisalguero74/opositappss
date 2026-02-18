import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/temas-oficiales
 * Obtiene todos los temas oficiales con contador de preguntas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const temas = await prisma.temaOficial.findMany({
      include: {
        _count: {
          select: {
            preguntas: true
          }
        }
      },
      orderBy: [
        { categoria: 'asc' },
        { numero: 'asc' }
      ]
    })

    return NextResponse.json({ temas })
  } catch (error) {
    console.error('Error loading temas:', error)
    return NextResponse.json(
      { error: 'Error al cargar temas' },
      { status: 500 }
    )
  }
}
