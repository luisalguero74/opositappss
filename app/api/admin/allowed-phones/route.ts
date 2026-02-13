import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../src/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizeSpanishPhone } from '@/lib/phone'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const phones = await prisma.allowedPhoneNumber.findMany({
      orderBy: { addedAt: 'desc' }
    })

    return NextResponse.json(phones)
  } catch (error) {
    console.error('Error fetching allowed phones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { phoneNumber, groupName } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Número de teléfono requerido' }, { status: 400 })
    }

    const normalized = normalizeSpanishPhone(phoneNumber)
    if (!normalized) {
      return NextResponse.json(
        { error: 'El número debe ser español (9 dígitos) con o sin +34' },
        { status: 400 }
      )
    }

    // Evitar duplicados históricos en distintos formatos
    await prisma.allowedPhoneNumber.deleteMany({
      where: { phoneNumber: { in: normalized.variants } }
    })

    const phone = await prisma.allowedPhoneNumber.create({
      data: { phoneNumber: normalized.canonical, groupName: groupName || null }
    })

    return NextResponse.json(phone)
  } catch (error) {
    console.error('Error creating allowed phone:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.allowedPhoneNumber.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting allowed phone:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
