import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Total de preguntas en el banco
    const total = await prisma.question.count({
      where: { questionnaireId: null }
    })

    // Validadas
    const validadas = await prisma.question.count({
      where: { 
        questionnaireId: null,
        reviewStatus: 'VALIDATED'
      }
    })

    // Pendientes
    const pendientes = await prisma.question.count({
      where: { 
        questionnaireId: null,
        reviewStatus: { not: 'VALIDATED' }
      }
    })

    // Sin tema
    const sinTema = await prisma.question.count({
      where: { 
        questionnaireId: null,
        temaCodigo: 'SIN_TEMA'
      }
    })

    // Distribución de dificultad
    const porDificultad = await prisma.question.groupBy({
      by: ['difficulty'],
      where: { questionnaireId: null },
      _count: true
    })

    const dificultad = {
      facil: porDificultad.find(d => d.difficulty === 'EASY')?._count || 0,
      media: porDificultad.find(d => d.difficulty === 'MEDIUM')?._count || 0,
      dificil: porDificultad.find(d => d.difficulty === 'HARD')?._count || 0
    }

    // Estadísticas por tema
    const temas = await prisma.temaOficial.findMany({
      orderBy: { id: 'asc' }
    })

    const porTema = await Promise.all(
      temas.map(async (tema) => {
        const totalTema = await prisma.question.count({
          where: { 
            questionnaireId: null,
            temaId: tema.id
          }
        })

        const validadasTema = await prisma.question.count({
          where: { 
            questionnaireId: null,
            temaId: tema.id,
            reviewStatus: 'VALIDATED'
          }
        })

        const porDificultadTema = await prisma.question.groupBy({
          by: ['difficulty'],
          where: { 
            questionnaireId: null,
            temaId: tema.id
          },
          _count: true
        })

        return {
          tema: tema.id,
          titulo: tema.titulo,
          total: totalTema,
          validadas: validadasTema,
          facil: porDificultadTema.find(d => d.difficulty === 'EASY')?._count || 0,
          media: porDificultadTema.find(d => d.difficulty === 'MEDIUM')?._count || 0,
          dificil: porDificultadTema.find(d => d.difficulty === 'HARD')?._count || 0
        }
      })
    )

    // Filtrar solo temas con preguntas
    const porTemaConDatos = porTema.filter(t => t.total > 0)

    // Tendencia (últimos 7 días)
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)

    const tendencia = []
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - i)
      fecha.setHours(0, 0, 0, 0)
      
      const siguienteDia = new Date(fecha)
      siguienteDia.setDate(siguienteDia.getDate() + 1)

      const count = await prisma.question.count({
        where: {
          questionnaireId: null,
          createdAt: {
            gte: fecha,
            lt: siguienteDia
          }
        }
      })

      tendencia.push({
        fecha: fecha.toISOString().split('T')[0],
        total: count
      })
    }

    return NextResponse.json({
      total,
      validadas,
      pendientes,
      sinTema,
      dificultad,
      porTema: porTemaConDatos,
      tendencia
    })
  } catch (error) {
    console.error('Error en banco-status:', error)
    return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 })
  }
}
