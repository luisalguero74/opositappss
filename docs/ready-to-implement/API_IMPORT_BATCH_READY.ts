// ==========================================
// API DE IMPORTACIÓN POR LOTES
// ==========================================
// API Route: /api/admin/questions/import-batch
// Importa preguntas validadas en lotes de 50

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Question {
  text: string
  options: string[] | { a: string; b: string; c: string; d: string }
  correctAnswer: string
  explanation?: string
  temaCodigo?: string
  temaNumero?: number
  temaParte?: string
  temaTitulo?: string
  difficulty?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      questions, 
      markReviewed = false, 
      importToBank = true 
    } = body

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ 
        error: 'No se proporcionaron preguntas válidas' 
      }, { status: 400 })
    }

    // Limitar a 50 preguntas por lote
    const batch = questions.slice(0, 50)
    
    // Obtener o crear banco de preguntas
    let questionnaireId = 'banco-preguntas-global'
    
    if (importToBank) {
      const questionnaire = await prisma.questionnaire.upsert({
        where: { id: questionnaireId },
        update: {},
        create: {
          id: questionnaireId,
          title: 'Banco de Preguntas Global',
          type: 'banco',
          published: false,
          category: 'general'
        }
      })
      questionnaireId = questionnaire.id
    }

    let imported = 0
    const errors: string[] = []

    for (const q of batch) {
      try {
        // Normalizar opciones a JSON string
        let optionsString = ''
        if (Array.isArray(q.options)) {
          optionsString = JSON.stringify(q.options)
        } else if (typeof q.options === 'object') {
          optionsString = JSON.stringify([q.options.a, q.options.b, q.options.c, q.options.d])
        } else if (typeof q.options === 'string') {
          try {
            JSON.parse(q.options) // Validar que es JSON válido
            optionsString = q.options
          } catch {
            optionsString = JSON.stringify([q.options])
          }
        }

        // Crear pregunta
        await prisma.question.create({
          data: {
            text: q.text,
            options: optionsString,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            temaCodigo: q.temaCodigo || null,
            temaNumero: q.temaNumero || null,
            temaParte: q.temaParte || null,
            temaTitulo: q.temaTitulo || null,
            difficulty: q.difficulty || 'media',
            reviewStatus: markReviewed ? 'VALIDATED' : 'PENDING',
            aiReviewed: markReviewed,
            questionnaireId
          }
        })

        imported++

      } catch (error) {
        console.error('[Import Batch] Error importing question:', error)
        errors.push(`Error en pregunta "${q.text?.substring(0, 50)}...": ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      total: batch.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Se importaron ${imported} de ${batch.length} preguntas`
    })

  } catch (error) {
    console.error('[Import Batch] Error:', error)
    return NextResponse.json({ 
      error: 'Error al importar preguntas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
