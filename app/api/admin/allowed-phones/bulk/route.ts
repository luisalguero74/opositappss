import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Normalizar números (quitar espacios, guiones, +)
    const normalizedNumbers = numbers
      .map(num => {
        // Quitar espacios, guiones, paréntesis
        let clean = num.replace(/[\s\-\(\)]/g, '')
        // Quitar + al inicio
        if (clean.startsWith('+')) {
          clean = clean.substring(1)
        }
        return clean
      })
      .filter(num => num.length >= 9 && /^\d+$/.test(num))

    if (normalizedNumbers.length === 0) {
      return NextResponse.json({ 
        error: 'Ningún número válido después de normalizar' 
      }, { status: 400 })
    }

    // Obtener números existentes
    const existingNumbers = await prisma.allowedPhoneNumber.findMany({
      select: { phoneNumber: true }
    })

    const existingSet = new Set(existingNumbers.map(p => p.phoneNumber))

    // Separar nuevos de duplicados
    const toAdd = normalizedNumbers.filter(num => !existingSet.has(num))
    const duplicates = normalizedNumbers.filter(num => existingSet.has(num))

    // Crear nuevos registros
    const created = await prisma.allowedPhoneNumber.createMany({
      data: toAdd.map(phoneNumber => ({
        phoneNumber,
        groupName: groupName || null
      }))
    })

    return NextResponse.json({
      success: true,
      added: created.count,
      duplicates: duplicates.length,
      total: normalizedNumbers.length,
      message: `Se añadieron ${created.count} números. ${duplicates.length} eran duplicados.`
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
