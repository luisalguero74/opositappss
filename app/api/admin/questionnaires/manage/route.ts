import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener cuestionarios publicados y borradores
    const [publicados, borradores] = await Promise.all([
      prisma.questionnaire.findMany({
        where: { published: true },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.questionnaire.findMany({
        where: { published: false },
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Obtener estadísticas
    const stats = {
      totalPublicados: publicados.length,
      totalBorradores: borradores.length,
      preguntasPublicadas: publicados.reduce((acc, q) => acc + q._count.questions, 0),
      preguntasBorradores: borradores.reduce((acc, q) => acc + q._count.questions, 0)
    }

    return NextResponse.json({
      publicados,
      borradores,
      stats
    })
  } catch (error) {
    console.error('Error obteniendo cuestionarios:', error)
    return NextResponse.json(
      { error: 'Error al cargar cuestionarios' },
      { status: 500 }
    )
  }
}
