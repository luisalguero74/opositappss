import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Deshabilitar caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const practicalCase = await prisma.questionnaire.findFirst({
      where: {
        id: id,
        type: 'practical',
        published: true
      },
      select: {
        id: true,
        title: true,
        theme: true,
        statement: true,
        type: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        questions: {
          select: {
            id: true,
            text: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!practicalCase) {
      return NextResponse.json({ error: 'Supuesto no encontrado' }, { status: 404 })
    }

    // IMPORTANTE: Parsear options de string a array
    const formattedCase = {
      ...practicalCase,
      questions: practicalCase.questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }))
    }

    return NextResponse.json({ practicalCase: formattedCase })
  } catch (error) {
    console.error('Error fetching practical case:', error)
    return NextResponse.json({ error: 'Error al cargar supuesto' }, { status: 500 })
  }
}
