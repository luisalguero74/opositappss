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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const pending = await prisma.repoAccessRequest.findFirst({
      where: { userId: session.user.id, status: RepoAccessRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: { id: true, desiredRole: true, status: true, createdAt: true },
    })

    return NextResponse.json({ pending })
  } catch (error) {
    console.error('[Repo Access Requests GET] Error:', error)
    return NextResponse.json({ error: 'Error al consultar solicitudes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const desiredRole = String(body?.desiredRole || '').toUpperCase()
    if (desiredRole !== 'READER' && desiredRole !== 'EDITOR') {
      return NextResponse.json({ error: 'desiredRole inválido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, repoRole: true, phoneNumber: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificación estricta: solo teléfonos permitidos pueden solicitar.
    const rawPhone = String(user.phoneNumber || '').trim()
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

    const currentRepoRole = String(user.repoRole || 'NONE').toUpperCase()

    // Reglas de solicitud: solo upgrades.
    if (desiredRole === 'READER') {
      if (currentRepoRole !== 'NONE') {
        return NextResponse.json({ error: 'Ya tienes acceso al repositorio' }, { status: 409 })
      }
    }

    if (desiredRole === 'EDITOR') {
      if (currentRepoRole === 'NONE') {
        return NextResponse.json({ error: 'Primero debes solicitar acceso como lector' }, { status: 409 })
      }
      if (currentRepoRole === 'EDITOR') {
        return NextResponse.json({ error: 'Ya eres editor del repositorio' }, { status: 409 })
      }
    }

    const existingPending = await prisma.repoAccessRequest.findFirst({
      where: { userId: user.id, status: RepoAccessRequestStatus.PENDING },
      select: { id: true },
    })

    if (existingPending) {
      return NextResponse.json({ error: 'Ya tienes una solicitud pendiente' }, { status: 409 })
    }

    const desiredRoleEnum = desiredRole === 'READER' ? RepoRole.READER : RepoRole.EDITOR
    const created = await prisma.repoAccessRequest.create({
      data: {
        userId: user.id,
        desiredRole: desiredRoleEnum,
        status: RepoAccessRequestStatus.PENDING,
      },
      select: { id: true, desiredRole: true, status: true, createdAt: true },
    })

    return NextResponse.json({ request: created })
  } catch (error) {
    console.error('[Repo Access Requests POST] Error:', error)
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })
  }
}
