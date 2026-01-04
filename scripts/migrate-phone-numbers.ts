#!/usr/bin/env tsx
/**
 * Script para DUPLICAR números del formato +346 creando versiones con +347
 * IMPORTANTE: Este script NO reemplaza números, sino que AÑADE variantes
 * 
 * Ejemplo: Si tienes +34656809596, creará TAMBIÉN +34756809596
 * Útil si quieres autorizar a usuarios que tengan números en ambos rangos
 * 
 * Uso: npx tsx scripts/migrate-phone-numbers.ts
 */

import { prisma } from '../src/lib/prisma'

async function migratePhoneNumbers() {
  console.log('🔄 Iniciando duplicación de números +346 → +347...\n')
  console.log('ℹ️  Este script AÑADE versiones +347 de tus números +346')
  console.log('ℹ️  NO elimina los números originales\n')

  try {
    // Buscar todos los números que empiezan con +346
    const oldFormatPhones = await prisma.allowedPhoneNumber.findMany({
      where: {
        phoneNumber: {
          startsWith: '+346'
        }
      }
    })

    if (oldFormatPhones.length === 0) {
      console.log('✅ No hay números con formato +346 para duplicar\n')
      return
    }

    console.log(`📱 Encontrados ${oldFormatPhones.length} números con formato +346:\n`)

    const toCreate = []
    
    for (const phone of oldFormatPhones) {
      const newPhone = '+347' + phone.phoneNumber.substring(4)
      
      // Verificar si el nuevo formato ya existe
      const exists = await prisma.allowedPhoneNumber.findUnique({
        where: { phoneNumber: newPhone }
      })

      if (exists) {
        console.log(`⚠️  ${phone.phoneNumber} → ${newPhone} (ya existe)`)
      } else {
        console.log(`✓ ${phone.phoneNumber} → ${newPhone} (se creará)`)
        toCreate.push({ phoneNumber: newPhone, groupName: phone.groupName })
      }
    }

    if (toCreate.length === 0) {
      console.log('\n✅ Todos los números ya tienen su equivalente en formato +347\n')
      return
    }

    console.log(`\n⚡ Se crearán ${toCreate.length} nuevos números`)
    console.log('⏳ Procesando...\n')

    let created = 0
    for (const newPhone of toCreate) {
      await prisma.allowedPhoneNumber.create({
        data: newPhone
      })
      created++
    }

    console.log(`✅ ¡Duplicación completada! ${created} números creados\n`)

    // Mostrar resumen
    console.log('📊 Resumen:')
    console.log(`   - Números originales +346: ${oldFormatPhones.length}`)
    console.log(`   - Nuevos números +347 creados: ${created}`)
    console.log(`   - Ya existían: ${oldFormatPhones.length - created}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error durante la duplicación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migratePhoneNumbers()
