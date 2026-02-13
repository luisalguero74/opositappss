import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSpanishPhone } from '@/lib/phone'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { numbers, groupName } = await req.json()

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de números' }, { status: 400 })
    }

    const normalized = numbers
      .map((num) => normalizeSpanishPhone(String(num ?? '')))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))

    if (normalized.length === 0) {
      return NextResponse.json({ 
        error: 'Ningún número válido después de normalizar' 
      }, { status: 400 })
    }

    const canonicalSet = new Set(normalized.map(n => n.canonical))
    const canonicals = Array.from(canonicalSet)

    // Eliminar representaciones antiguas para evitar duplicados entre formatos
    const allVariants = Array.from(new Set(normalized.flatMap(n => n.variants)))

    const created = await prisma.$transaction(async (tx) => {
      await tx.allowedPhoneNumber.deleteMany({
        where: { phoneNumber: { in: allVariants } }
      })

      return tx.allowedPhoneNumber.createMany({
        data: canonicals.map((phoneNumber) => ({
          phoneNumber,
          groupName: groupName || null
        })),
        skipDuplicates: true
      })
    })

    return NextResponse.json({
      success: true,
      added: created.count,
      duplicates: normalized.length - created.count,
      total: normalized.length,
      message: `Se añadieron ${created.count} números (formato canónico +34).`
    })
  } catch (error) {
    console.error('Error en bulk import:', error)
    return NextResponse.json({ error: 'Error al importar números' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { ids } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs' }, { status: 400 })
    }

    const deleted = await prisma.allowedPhoneNumber.deleteMany({
      where: { id: { in: ids } }
    })

    return NextResponse.json({ success: true, deleted: deleted.count })
  } catch (error) {
    console.error('Error en bulk delete:', error)
    return NextResponse.json({ error: 'Error al eliminar números' }, { status: 500 })
  }
}
