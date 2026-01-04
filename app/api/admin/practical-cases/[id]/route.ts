import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const practicalCase = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!practicalCase || practicalCase.type !== 'practical') {
      return NextResponse.json({ error: 'Supuesto práctico no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ practicalCase })
  } catch (error) {
    console.error('Error fetching practical case:', error)
    return NextResponse.json({ error: 'Error al obtener supuesto práctico' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { title, theme, statement, questions } = await req.json()

    // Actualizar supuesto práctico
    const updatedCase = await prisma.questionnaire.update({
      where: { id },
      data: {
        title,
        theme,
        statement
      }
    })

    // Actualizar preguntas si se proporcionaron
    if (questions && Array.isArray(questions)) {
      for (const question of questions) {
        if (question.id) {
          await prisma.question.update({
            where: { id: question.id },
            data: {
              text: question.text,
              options: JSON.stringify(question.options),
              correctAnswer: question.correctAnswer,
              explanation: question.explanation
            }
          })
        }
      }
    }

    const practicalCase = await prisma.questionnaire.findUnique({
      where: { id },
      include: { questions: true }
    })

    return NextResponse.json({ 
      success: true, 
      practicalCase,
      message: 'Supuesto práctico actualizado correctamente'
    })

  } catch (error) {
    console.error('Error updating practical case:', error)
    return NextResponse.json({ error: 'Error al actualizar supuesto práctico' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.questionnaire.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Supuesto práctico eliminado correctamente'
    })

  } catch (error) {
    console.error('Error deleting practical case:', error)
    return NextResponse.json({ error: 'Error al eliminar supuesto práctico' }, { status: 500 })
  }
}

// Validar y publicar supuesto práctico
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { action, category } = await req.json()

    if (action === 'publish') {
      const practicalCase = await prisma.questionnaire.update({
        where: { id },
        data: { 
          published: true,
          category: category || 'supuesto' // Por defecto 'supuesto' si no se especifica
        } as any
      })

      return NextResponse.json({ 
        success: true, 
        practicalCase,
        message: 'Supuesto práctico publicado correctamente'
      })
    }

    if (action === 'unpublish') {
      const practicalCase = await prisma.questionnaire.update({
        where: { id },
        data: { 
          published: false,
          category: null // Limpiar categoría al despublicar
        } as any
      })

      return NextResponse.json({ 
        success: true, 
        practicalCase,
        message: 'Supuesto práctico despublicado'
      })
    }

    if (action === 'change-category') {
      const practicalCase = await prisma.questionnaire.update({
        where: { id },
        data: { 
          category: category // Cambiar categoría sin despublicar
        } as any
      })

      return NextResponse.json({ 
        success: true, 
        practicalCase,
        message: `Movido a ${category === 'supuesto' ? 'Supuestos Prácticos' : 'Casos Prácticos'}`
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Error publishing practical case:', error)
    return NextResponse.json({ error: 'Error al publicar supuesto práctico' }, { status: 500 })
  }
}
