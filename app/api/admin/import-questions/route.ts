import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint para importación masiva de preguntas
// Solo accesible con clave secreta
export async function POST(req: NextRequest) {
  try {
    // Verificar clave secreta
    const authHeader = req.headers.get('authorization')
    const secret = process.env.IMPORT_SECRET || 'opositapp-import-2026'
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { questionnaires } = body

    if (!Array.isArray(questionnaires)) {
      return NextResponse.json({ error: 'Se requiere un array de cuestionarios' }, { status: 400 })
    }

    let imported = 0
    let failed = 0
    const results = []

    for (const q of questionnaires) {
      try {
        const questionnaire = await prisma.questionnaire.create({
          data: {
            title: q.title,
            type: q.type || 'theory',
            published: true,
            questions: {
              create: q.questions.map((question: any) => ({
                text: question.text,
                options: JSON.stringify(question.options),
                correctAnswer: question.correctAnswer,
                explanation: question.explanation || '',
                temaCodigo: question.temaCodigo || null,
                temaNumero: question.temaNumero || null,
                temaParte: question.temaParte || null,
                temaTitulo: question.temaTitulo || null,
                difficulty: question.difficulty || 'media',
                legalBasis: question.legalBasis || null
              }))
            }
          }
        })

        imported++
        results.push({ title: q.title, success: true, id: questionnaire.id })
      } catch (error: any) {
        failed++
        results.push({ title: q.title, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: questionnaires.length,
      results
    })
  } catch (error: any) {
    console.error('[Import] Error:', error)
    return NextResponse.json({ 
      error: 'Error en importación',
      details: error.message 
    }, { status: 500 })
  }
}
