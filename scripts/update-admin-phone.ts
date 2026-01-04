/**
 * Script para actualizar el número de teléfono del usuario administrador existente
 */

import { prisma } from '../src/lib/prisma'

async function updateAdminPhone() {
  const email = 'luisalguero74@gmail.com'
  const phoneNumber = '+34656809596'

  console.log(`📱 Actualizando número de teléfono para ${email}...\n`)

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { phoneNumber }
    })

    console.log(`✅ Número actualizado correctamente`)
    console.log(`   Usuario: ${user.email}`)
    console.log(`   Teléfono: ${user.phoneNumber}`)
    console.log(`   Rol: ${user.role}\n`)
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log(`❌ No se encontró el usuario ${email}\n`)
    } else {
      console.error(`❌ Error:`, error)
    }
  }
}

updateAdminPhone()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
