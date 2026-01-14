import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Ejecutar validaciones
    const issues = await runQualityChecks()

    return NextResponse.json({ issues })
  } catch (error) {
    console.error('[Quality Control GET Error]:', error)
    return NextResponse.json(
      { error: 'Error al obtener problemas de calidad' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Re-ejecutar análisis
    const issues = await runQualityChecks()

    return NextResponse.json({ success: true, issues })
  } catch (error) {
    console.error('[Quality Control POST Error]:', error)
    return NextResponse.json(
      { error: 'Error al ejecutar análisis de calidad' },
      { status: 500 }
    )
  }
}

async function runQualityChecks() {
  const issues: Array<{
    id: string
    type: 'duplicate' | 'no_correct' | 'incomplete' | 'malformed'
    severity: 'low' | 'medium' | 'high'
    questionId: string
    questionText: string
    details: string
  }> = []

  // Obtener todas las preguntas
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      text: true,
      options: true,
      correctAnswer: true,
      explanation: true
    }
  })

  // CHECK 1: Preguntas duplicadas (mismo texto)
  const textMap = new Map<string, string[]>()
  questions.forEach(q => {
    const normalizedText = q.text.toLowerCase().trim()
    if (!textMap.has(normalizedText)) {
      textMap.set(normalizedText, [])
    }
    textMap.get(normalizedText)!.push(q.id)
  })

  textMap.forEach((ids, text) => {
    if (ids.length > 1) {
      ids.forEach(id => {
        const question = questions.find(q => q.id === id)
        if (question) {
          issues.push({
            id: `dup_${id}`,
            type: 'duplicate',
            severity: 'medium',
            questionId: id,
            questionText: question.text,
            details: `Duplicada ${ids.length - 1} veces. IDs: ${ids.filter(i => i !== id).join(', ')}`
          })
        }
      })
    }
  })

  // CHECK 2: Preguntas sin respuesta correcta válida
  questions.forEach(q => {
    try {
      const options = JSON.parse(q.options)
      if (!Array.isArray(options) || options.length === 0) {
        issues.push({
          id: `no_opt_${q.id}`,
          type: 'incomplete',
          severity: 'high',
          questionId: q.id,
          questionText: q.text,
          details: 'No tiene opciones de respuesta definidas'
        })
      } else if (!q.correctAnswer || q.correctAnswer.trim() === '') {
        issues.push({
          id: `no_corr_${q.id}`,
          type: 'no_correct',
          severity: 'high',
          questionId: q.id,
          questionText: q.text,
          details: 'No tiene respuesta correcta definida'
        })
      } else if (!options.includes(q.correctAnswer)) {
        issues.push({
          id: `invalid_corr_${q.id}`,
          type: 'no_correct',
          severity: 'high',
          questionId: q.id,
          questionText: q.text,
          details: `La respuesta correcta "${q.correctAnswer}" no está entre las opciones`
        })
      }
    } catch (error) {
      issues.push({
        id: `malformed_${q.id}`,
        type: 'malformed',
        severity: 'high',
        questionId: q.id,
        questionText: q.text,
        details: 'Las opciones no están en formato JSON válido'
      })
    }
  })

  // CHECK 3: Preguntas sin explicación
  questions.forEach(q => {
    if (!q.explanation || q.explanation.trim() === '') {
      issues.push({
        id: `no_expl_${q.id}`,
        type: 'incomplete',
        severity: 'low',
        questionId: q.id,
        questionText: q.text,
        details: 'No tiene explicación de la respuesta correcta'
      })
    }
  })

  // CHECK 4: Preguntas con texto muy corto (probablemente incompletas)
  questions.forEach(q => {
    if (q.text.length < 10) {
      issues.push({
        id: `short_${q.id}`,
        type: 'incomplete',
        severity: 'medium',
        questionId: q.id,
        questionText: q.text,
        details: `Texto muy corto (${q.text.length} caracteres). Probablemente incompleta`
      })
    }
  })

  return issues
}
