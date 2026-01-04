import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * API unificada que carga preguntas de múltiples fuentes
 * Combina: Question (manuales) + GeneratedQuestion (IA aprobadas)
 * Clasificadas por tema automáticamente
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '500')
    const filterTema = searchParams.get('tema')
    const filterType = searchParams.get('type') // 'manual' | 'ai' | 'all'

    // 1. Cargar preguntas manuales (Question) - vinculadas a cuestionarios publicados
    const manualQuestions = await prisma.question.findMany({
      take: limit,
      where: {
        questionnaire: {
          published: true
        },
        ...(filterTema && { temaCodigo: filterTema })
      }
    })

    // 2. Cargar preguntas generadas por IA (GeneratedQuestion)
    const aiQuestions = await prisma.generatedQuestion.findMany({
      take: limit,
      where: {
        approved: true,
        ...(filterTema && { topic: filterTema })
      },
      include: {
        document: true
      }
    })

    // 3. Combinar y normalizar
    const combinedQuestions = [
      ...manualQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'media',
        tema: q.temaTitulo || q.temaCodigo || 'Sin tema',
        temaCodigo: q.temaCodigo,
        source: 'manual' as const
      })),
      ...aiQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'media',
        tema: q.topic || 'Sin tema',
        temaCodigo: q.topic,
        source: 'ai' as const
      }))
    ]

    // 4. Filtrar duplicados (comparar texto)
    const seen = new Set<string>()
    const uniqueQuestions = combinedQuestions.filter(q => {
      const key = `${q.text}|${q.correctAnswer}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 5. Obtener temas únicos para filtros
    const temas = Array.from(new Set(uniqueQuestions.map(q => q.tema).filter(Boolean))) as string[]

    return NextResponse.json({
      success: true,
      questions: uniqueQuestions,
      temas,
      total: uniqueQuestions.length,
      summary: {
        manual: manualQuestions.length,
        ai: aiQuestions.length,
        duplicateRemoved: combinedQuestions.length - uniqueQuestions.length
      }
    })
  } catch (error) {
    console.error('Error en API unificada de preguntas:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}
