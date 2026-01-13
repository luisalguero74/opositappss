import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Revisar/aprobar pregunta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    const normalizeSecret = (value: string | null | undefined) =>
      String(value || '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .trim()

    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    const receivedApiKey = normalizeSecret(req.headers.get('x-api-key'))
    const apiKeyOk = Boolean(expectedApiKey && receivedApiKey && expectedApiKey === receivedApiKey)
    const isAdminSession = Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
    if (!isAdminSession && !apiKeyOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { approved, reviewed, text, options, correctAnswer, explanation, difficulty, topic, type } = body

    // Preparar datos para actualización
    const updateData: any = {}
    
    if (text !== undefined) updateData.text = text
    if (options !== undefined) updateData.options = typeof options === 'string' ? options : JSON.stringify(options)
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
    if (explanation !== undefined) updateData.explanation = explanation
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (topic !== undefined) updateData.topic = topic
    
    // Si se cambia el tipo, actualizar el documento asociado
    if (type !== undefined) {
      const question = await prisma.generatedQuestion.findUnique({
        where: { id },
        select: { documentId: true }
      })
      if (question?.documentId) {
        await prisma.legalDocument.update({
          where: { id: question.documentId },
          data: { documentType: type }
        })
      }
    }
    
    // Si se aprueba/desaprueba, marcar como revisada
    if (approved !== undefined || reviewed !== undefined) {
      updateData.approved = approved !== undefined ? approved : false
      updateData.reviewed = reviewed !== undefined ? reviewed : true
      updateData.reviewedBy = session?.user?.id || session?.user?.email || 'api-key'
      updateData.reviewedAt = new Date()
    }

    const question = await prisma.generatedQuestion.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ question })

  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }
    console.error('[AI Questions] Error al actualizar:', error)
    return NextResponse.json({ error: 'Error al actualizar pregunta' }, { status: 500 })
  }
}

// DELETE - Eliminar pregunta
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    const normalizeSecret = (value: string | null | undefined) =>
      String(value || '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .trim()

    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    const receivedApiKey = normalizeSecret(req.headers.get('x-api-key'))
    const apiKeyOk = Boolean(expectedApiKey && receivedApiKey && expectedApiKey === receivedApiKey)
    const isAdminSession = Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
    if (!isAdminSession && !apiKeyOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    await prisma.generatedQuestion.delete({ where: { id } })

    return NextResponse.json({ message: 'Pregunta eliminada' })
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })
    }
    console.error('[AI Questions] Error al eliminar:', error)
    return NextResponse.json({ error: 'Error al eliminar pregunta' }, { status: 500 })
  }
}
