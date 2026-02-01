import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RepoAccessRequestStatus, RepoRole } from '@prisma/client'

function normalizeSpanishPhone(raw: string): { phoneToCheck: string; normalizedPhone: string; phoneWithoutCountry: string } {
  const normalizedPhone = String(raw || '').replace(/[\s-]/g, '')
  const phoneToCheck = normalizedPhone.startsWith('+34')
    ? normalizedPhone
    : normalizedPhone.startsWith('34')
      ? '+' + normalizedPhone
      : '+34' + normalizedPhone
  const phoneWithoutCountry = phoneToCheck.replace(/^\+34/, '')
  return { phoneToCheck, normalizedPhone, phoneWithoutCountry }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    if (!session?.user?.id || role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const requests = await prisma.repoAccessRequest.findMany({
      where: { status: RepoAccessRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, email: true, phoneNumber: true, repoRole: true } },
      },
    })

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        desiredRole: r.desiredRole,
        status: r.status,
        createdAt: r.createdAt,
        user: r.user,
      })),
    })
  } catch (error) {
    console.error('[Admin Repo Access Requests GET] Error:', error)
    return NextResponse.json({ error: 'Error al cargar solicitudes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()
    if (!session?.user?.id || role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const requestId = String(body?.requestId || '')
    const action = String(body?.action || '')

    if (!requestId || (action !== 'approve' && action !== 'deny')) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const requestRow = await prisma.repoAccessRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, repoRole: true, phoneNumber: true } } },
    })

    if (!requestRow || requestRow.status !== RepoAccessRequestStatus.PENDING) {
      return NextResponse.json({ error: 'Solicitud no encontrada o ya resuelta' }, { status: 404 })
    }

    // Re-verificar teléfono permitido antes de decidir.
    const rawPhone = String(requestRow.user.phoneNumber || '').trim()
    if (!rawPhone) {
      return NextResponse.json({ error: 'Teléfono no disponible para validar' }, { status: 403 })
    }

    const { phoneToCheck, normalizedPhone, phoneWithoutCountry } = normalizeSpanishPhone(rawPhone)
    const allowedPhone = await prisma.allowedPhoneNumber.findFirst({
      where: {
        OR: [
          { phoneNumber: phoneToCheck },
          { phoneNumber: normalizedPhone },
          { phoneNumber: phoneWithoutCountry },
        ],
      },
      select: { id: true },
    })

    if (!allowedPhone) {
      return NextResponse.json({ error: 'Teléfono no autorizado' }, { status: 403 })
    }

    const now = new Date()

    if (action === 'deny') {
      await prisma.repoAccessRequest.update({
        where: { id: requestRow.id },
        data: {
          status: RepoAccessRequestStatus.DENIED,
          decidedAt: now,
          decidedByUserId: session.user.id,
        },
      })

      return NextResponse.json({ success: true })
    }

    // approve
    await prisma.$transaction(async (tx) => {
      await tx.repoAccessRequest.update({
        where: { id: requestRow.id },
        data: {
          status: RepoAccessRequestStatus.APPROVED,
          decidedAt: now,
          decidedByUserId: session.user.id,
        },
      })

      const desired = String(requestRow.desiredRole).toUpperCase()
      if (desired === 'READER') {
        await tx.user.update({
          where: { id: requestRow.userId },
          data: { repoRole: RepoRole.READER },
        })
      } else if (desired === 'EDITOR') {
        // Editor implica que como mínimo ya es lector.
        await tx.user.update({
          where: { id: requestRow.userId },
          data: { repoRole: RepoRole.EDITOR },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Repo Access Requests POST] Error:', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
}
