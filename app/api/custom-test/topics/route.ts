import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'
import { temaCodigoVariants } from '@/lib/tema-codigo'

// GET - Obtener temas disponibles con conteo de preguntas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isAdmin = session.user?.role === 'admin'

    // Obtener conteo de preguntas por tema del temario oficial
    const allTopics: { id: string; topic: string; count: number }[] = []

    for (const tema of TEMARIO_OFICIAL) {
      const variantes = temaCodigoVariants(tema.id).map(v => v.toUpperCase())
      const count = await prisma.question.count({
        where: {
          temaCodigo: { in: variantes },
          ...(isAdmin ? {} : { questionnaire: { published: true } })
        }
      })

      allTopics.push({
        id: tema.id,
        topic: `${tema.numero}. ${tema.titulo}`,
        count
      })
    }

    const general = allTopics.filter(t => t.id.toLowerCase().startsWith('g'))
    const specific = allTopics.filter(t => t.id.toLowerCase().startsWith('e'))

    return NextResponse.json({
      all: allTopics,
      general,
      specific,
      totals: {
        general: general.reduce((sum, t) => sum + t.count, 0),
        specific: specific.reduce((sum, t) => sum + t.count, 0),
        total: allTopics.reduce((sum, t) => sum + t.count, 0)
      }
    })
  } catch (error) {
    console.error('[Custom Test Topics] Error:', error)
    return NextResponse.json({ error: 'Error al cargar temas' }, { status: 500 })
  }
}
