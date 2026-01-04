import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ManualQuestion {
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface ManualPracticalCase {
  title: string
  theme?: string
  statement: string
  questions: ManualQuestion[]
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data: ManualPracticalCase = await req.json()

    // Validaciones
    if (!data.title || !data.statement) {
      return NextResponse.json({ error: 'Título y enunciado son obligatorios' }, { status: 400 })
    }

    if (!data.questions || data.questions.length === 0 || data.questions.length > 15) {
      return NextResponse.json({ error: 'Debe haber entre 1 y 15 preguntas' }, { status: 400 })
    }

    // Validar cada pregunta
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i]
      
      if (!q.text || q.text.trim().length === 0) {
        return NextResponse.json({ 
          error: `La pregunta ${i + 1} está vacía` 
        }, { status: 400 })
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json({ 
          error: `La pregunta ${i + 1} debe tener exactamente 4 opciones` 
        }, { status: 400 })
      }

      if (q.options.some(opt => !opt || opt.trim().length === 0)) {
        return NextResponse.json({ 
          error: `La pregunta ${i + 1} tiene opciones vacías` 
        }, { status: 400 })
      }

      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        return NextResponse.json({ 
          error: `La pregunta ${i + 1} tiene una respuesta correcta inválida` 
        }, { status: 400 })
      }
    }

    // Crear supuesto práctico en base de datos
    const practicalCase = await prisma.questionnaire.create({
      data: {
        title: data.title.trim(),
        type: 'practical',
        theme: data.theme?.trim() || null,
        statement: data.statement.trim(),
        published: false,
        questions: {
          create: data.questions.map((q, index) => ({
            text: q.text.trim(),
            options: JSON.stringify(q.options.map(opt => opt.trim())),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation?.trim() || ''
          }))
        }
      },
      include: {
        questions: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      practicalCase,
      message: `Supuesto práctico creado con ${data.questions.length} preguntas`
    })

  } catch (error) {
    console.error('Error creating manual practical case:', error)
    return NextResponse.json({ 
      error: 'Error al crear supuesto práctico',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
