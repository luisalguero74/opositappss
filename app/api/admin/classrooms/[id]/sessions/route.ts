import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// POST - Crear sesión y enviar invitaciones
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { title, description, scheduledAt, duration, sendInvitations } = body

    if (!title || !scheduledAt || !duration) {
      return NextResponse.json({ 
        error: 'Título, fecha y duración son requeridos' 
      }, { status: 400 })
    }

    // Obtener aula
    const classroom = await prisma.virtualClassroom.findUnique({
      where: { id }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Aula no encontrada' }, { status: 404 })
    }

    // Obtener participantes
    const participants = await prisma.classroomParticipant.findMany({
      where: { classroomId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    // Crear sesión
    const classSession = await prisma.classSession.create({
      data: {
        classroomId: id,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration
      }
    })

    // Enviar invitaciones si se solicita
    if (sendInvitations && participants.length > 0) {
      const classroomUrl = `${process.env.NEXTAUTH_URL}/classroom/${classroom.id}`
      const scheduledDate = new Date(scheduledAt).toLocaleString('es-ES', {
        dateStyle: 'full',
        timeStyle: 'short'
      })

      type ParticipantWithUser = {
        user: { email: string; name: string | null }
      }

      const emailPromises = participants.map((participant: ParticipantWithUser) =>
        sendEmail({
          to: participant.user.email,
          subject: `Invitación: ${title} - ${classroom.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">📚 Invitación a Clase Virtual</h2>
              <p>Hola ${participant.user.name || participant.user.email},</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${title}</h3>
                <p><strong>Aula:</strong> ${classroom.name}</p>
                ${description ? `<p><strong>Descripción:</strong> ${description}</p>` : ''}
                <p><strong>Fecha y hora:</strong> ${scheduledDate}</p>
                <p><strong>Duración:</strong> ${duration} minutos</p>
              </div>

              <p>Haz clic en el siguiente enlace para acceder al aula virtual:</p>
              
              <a href="${classroomUrl}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Entrar al Aula Virtual
              </a>

              ${classroom.password ? `<p><strong>Contraseña:</strong> ${classroom.password}</p>` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Este es un mensaje automático de opositAPPSS. Por favor, no respondas a este correo.
              </p>
            </div>
          `
        })
      )

      await Promise.allSettled(emailPromises)
      console.log(`[Sessions] Invitaciones enviadas a ${participants.length} participantes`)
    }

    return NextResponse.json({
      session: classSession,
      invitationsSent: sendInvitations ? participants.length : 0
    })
  } catch (error) {
    console.error('[Sessions POST] Error:', error)
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })
  }
}

// GET - Obtener sesiones del aula
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const sessions = await prisma.classSession.findMany({
      where: {
        classroomId: id
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('[Sessions GET] Error:', error)
    return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
  }
}
