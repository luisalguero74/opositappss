import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// POST - Crear nuevo examen oficial (solo admin)
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, testQuestions, practicalCase, published } = body

    // ========================================================================
    // Validación estricta de la estructura
    // ========================================================================
    
    // Validar Parte 1: 70 preguntas tipo test
    if (!Array.isArray(testQuestions) || testQuestions.length !== 70) {
      return NextResponse.json({ 
        error: 'testQuestions debe ser un array de exactamente 70 preguntas' 
      }, { status: 400 })
    }

    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i]
      if (!q.text || typeof q.text !== 'string') {
        return NextResponse.json({ 
          error: `Pregunta ${i + 1}: falta campo 'text'` 
        }, { status: 400 })
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json({ 
          error: `Pregunta ${i + 1}: 'options' debe tener exactamente 4 opciones` 
        }, { status: 400 })
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        return NextResponse.json({ 
          error: `Pregunta ${i + 1}: 'correctAnswer' debe ser A, B, C o D` 
        }, { status: 400 })
      }
      if (!q.explanation || typeof q.explanation !== 'string') {
        return NextResponse.json({ 
          error: `Pregunta ${i + 1}: falta campo 'explanation'` 
        }, { status: 400 })
      }
    }

    // Validar Parte 2: Supuesto práctico
    if (!practicalCase || typeof practicalCase !== 'object') {
      return NextResponse.json({ 
        error: 'practicalCase debe ser un objeto con statement y questions' 
      }, { status: 400 })
    }

    if (!practicalCase.statement || typeof practicalCase.statement !== 'string') {
      return NextResponse.json({ 
        error: 'practicalCase.statement es obligatorio' 
      }, { status: 400 })
    }

    if (!Array.isArray(practicalCase.questions) || practicalCase.questions.length !== 15) {
      return NextResponse.json({ 
        error: 'practicalCase.questions debe ser un array de exactamente 15 preguntas' 
      }, { status: 400 })
    }

    for (let i = 0; i < practicalCase.questions.length; i++) {
      const q = practicalCase.questions[i]
      if (!q.text || typeof q.text !== 'string') {
        return NextResponse.json({ 
          error: `Supuesto pregunta ${i + 1}: falta campo 'text'` 
        }, { status: 400 })
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json({ 
          error: `Supuesto pregunta ${i + 1}: 'options' debe tener 4 opciones` 
        }, { status: 400 })
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        return NextResponse.json({ 
          error: `Supuesto pregunta ${i + 1}: 'correctAnswer' debe ser A, B, C o D` 
        }, { status: 400 })
      }
      if (!q.explanation || typeof q.explanation !== 'string') {
        return NextResponse.json({ 
          error: `Supuesto pregunta ${i + 1}: falta campo 'explanation'` 
        }, { status: 400 })
      }
    }

    // ========================================================================
    // Si se marca como activo, desactivar todos los demás exámenes
    // ========================================================================
    const active = published === true

    if (active) {
      await prisma.examOfficial.updateMany({
        where: { active: true },
        data: { active: false }
      })
    }

    // ========================================================================
    // Crear el examen oficial
    // ========================================================================
    const exam = await prisma.examOfficial.create({
      data: {
        title: title || 'Examen Oficial',
        description: description || '',
        testQuestions: JSON.stringify(testQuestions),
        practicalCase: JSON.stringify(practicalCase),
        published: published === true,
        active
      }
    })

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        published: exam.published,
        active: exam.active,
        createdAt: exam.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('[Admin Exam Official POST] Error:', error)
    return NextResponse.json({ 
      error: 'Error al crear examen oficial',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// GET - Listar todos los exámenes oficiales (solo admin)
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const exams = await prisma.examOfficial.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        published: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attempts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ exams })

  } catch (error) {
    console.error('[Admin Exam Official GET] Error:', error)
    return NextResponse.json({ 
      error: 'Error al listar exámenes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// PATCH - Actualizar examen oficial (solo admin)
// ============================================================================
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { examId, active, published } = body

    if (!examId) {
      return NextResponse.json({ error: 'examId es obligatorio' }, { status: 400 })
    }

    // Si se activa este examen, desactivar los demás
    if (active === true) {
      await prisma.examOfficial.updateMany({
        where: { 
          active: true,
          id: { not: examId }
        },
        data: { active: false }
      })
    }

    const exam = await prisma.examOfficial.update({
      where: { id: examId },
      data: {
        ...(typeof published === 'boolean' && { published }),
        ...(typeof active === 'boolean' && { active })
      }
    })

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        published: exam.published,
        active: exam.active
      }
    })

  } catch (error) {
    console.error('[Admin Exam Official PATCH] Error:', error)
    return NextResponse.json({ 
      error: 'Error al actualizar examen',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
