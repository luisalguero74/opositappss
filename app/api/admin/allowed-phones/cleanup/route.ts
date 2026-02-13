import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSpanishPhone } from '@/lib/phone'

// Elimina números duplicados conservando el registro más reciente por número
export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const phones = await prisma.allowedPhoneNumber.findMany({
      orderBy: { addedAt: 'desc' },
      select: { id: true, phoneNumber: true }
    })

    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const phone of phones) {
      const normalized = normalizeSpanishPhone(phone.phoneNumber)
      const key = normalized?.canonical ?? phone.phoneNumber

      if (seen.has(key)) duplicates.push(phone.id)
      else seen.add(key)
    }

    if (duplicates.length === 0) {
      return NextResponse.json({ removed: 0, message: 'No se encontraron duplicados' })
    }

    const result = await prisma.allowedPhoneNumber.deleteMany({ where: { id: { in: duplicates } } })

    return NextResponse.json({ removed: result.count, message: 'Duplicados eliminados' })
  } catch (error) {
    console.error('Error al eliminar duplicados:', error)
    return NextResponse.json({ error: 'Error al eliminar duplicados' }, { status: 500 })
  }
}
