import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * GET: Obtener información actual del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error al obtener información de cuenta:', error)
    return NextResponse.json({ error: 'Error al cargar información de cuenta' }, { status: 500 })
  }
}

/**
 * PUT: Actualizar información del usuario
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { action, name, email, currentPassword, newPassword } = body

    // Validar acción
    if (!action) {
      return NextResponse.json({ error: 'Acción no especificada' }, { status: 400 })
    }

    const userId = session.user.id

    // ===== ACTUALIZAR PERFIL =====
    if (action === 'updateProfile') {
      if (!name?.trim()) {
        return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
      }

      const updateData: any = {}

      if (name.trim()) {
        updateData.name = name.trim()
      }

      if (email?.trim() && email.trim() !== session.user.email) {
        // Verificar que el email no esté en uso
        const existingUser = await prisma.user.findUnique({
          where: { email: email.trim() },
        })

        if (existingUser && existingUser.id !== userId) {
          return NextResponse.json(
            { error: 'Este correo electrónico ya está registrado' },
            { status: 409 }
          )
        }

        updateData.email = email.trim()
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No hay cambios para guardar' },
          { status: 400 }
        )
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Perfil actualizado correctamente',
        user: updatedUser,
      })
    }

    // ===== CAMBIAR CONTRASEÑA =====
    if (action === 'changePassword') {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'La contraseña actual es requerida' },
          { status: 400 }
        )
      }

      if (!newPassword) {
        return NextResponse.json(
          { error: 'La nueva contraseña es requerida' },
          { status: 400 }
        )
      }

      // Validar longitud de contraseña
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        )
      }

      if (newPassword.length > 128) {
        return NextResponse.json(
          { error: 'La contraseña es demasiado larga (máximo 128 caracteres)' },
          { status: 400 }
        )
      }

      // Validar que las contraseñas sean diferentes
      if (currentPassword === newPassword) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe ser diferente a la actual' },
          { status: 400 }
        )
      }

      // Obtener usuario con contraseña hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }

      if (!user.password) {
        return NextResponse.json(
          { error: 'Este usuario no tiene contraseña configurada. Contacta al administrador.' },
          { status: 400 }
        )
      }

      // Verificar contraseña actual
      const passwordMatch = await bcrypt.compare(currentPassword, user.password)
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 401 }
        )
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Actualizar contraseña
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada correctamente',
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar cuenta:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
