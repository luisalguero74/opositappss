#!/usr/bin/env tsx
/**
 * Script para normalizar números de teléfono en la base de datos
 * Añade el prefijo +34 a números que no lo tienen
 * Uso: npx tsx scripts/normalize-phone-numbers.ts
 */

import { prisma } from '../src/lib/prisma'

async function normalizePhoneNumbers() {
  console.log('🔄 Iniciando normalización de números de teléfono...\n')

  try {
    // Buscar todos los números permitidos
    const allPhones = await prisma.allowedPhoneNumber.findMany()

    if (allPhones.length === 0) {
      console.log('✅ No hay números en la base de datos\n')
      return
    }

    console.log(`📱 Encontrados ${allPhones.length} números en total\n`)

    const updates = []
    const correct = []
    
    for (const phone of allPhones) {
      let normalizedPhone = phone.phoneNumber

      // Eliminar espacios y guiones
      normalizedPhone = normalizedPhone.replace(/[\s-]/g, '')

      // Añadir +34 si no lo tiene
      if (!normalizedPhone.startsWith('+34')) {
        if (normalizedPhone.startsWith('34')) {
          normalizedPhone = '+' + normalizedPhone
        } else if (/^\d{9}$/.test(normalizedPhone)) {
          normalizedPhone = '+34' + normalizedPhone
        }
      }

      // Validar formato final
      if (!/^\+34\d{9}$/.test(normalizedPhone)) {
        console.log(`⚠️  ${phone.phoneNumber} → Formato inválido, se omitirá`)
        continue
      }

      if (normalizedPhone !== phone.phoneNumber) {
        // Verificar si el formato normalizado ya existe
        const exists = await prisma.allowedPhoneNumber.findFirst({
          where: { 
            phoneNumber: normalizedPhone,
            id: { not: phone.id }
          }
        })

        if (exists) {
          console.log(`⚠️  ${phone.phoneNumber} → ${normalizedPhone} (duplicado, se eliminará el original)`)
          // Eliminar el duplicado antiguo
          await prisma.allowedPhoneNumber.delete({ where: { id: phone.id } })
        } else {
          console.log(`✓ ${phone.phoneNumber} → ${normalizedPhone} (se actualizará)`)
          updates.push({ id: phone.id, oldPhone: phone.phoneNumber, newPhone: normalizedPhone })
        }
      } else {
        correct.push(phone.phoneNumber)
      }
    }

    console.log(`\n✅ Números ya correctos: ${correct.length}`)

    if (updates.length === 0) {
      console.log('✅ No hay números que normalizar\n')
      return
    }

    console.log(`⚡ Se actualizarán ${updates.length} números`)
    console.log('⏳ Procesando...\n')

    let updated = 0
    for (const update of updates) {
      await prisma.allowedPhoneNumber.update({
        where: { id: update.id },
        data: { phoneNumber: update.newPhone }
      })
      updated++
    }

    console.log(`✅ ¡Normalización completada! ${updated} números actualizados\n`)

    // Mostrar resumen
    console.log('📊 Resumen:')
    console.log(`   - Total de números: ${allPhones.length}`)
    console.log(`   - Ya correctos: ${correct.length}`)
    console.log(`   - Actualizados: ${updated}`)
    console.log('')

    // Mostrar números finales
    const finalPhones = await prisma.allowedPhoneNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    })
    
    console.log('📱 Números finales en la base de datos:')
    finalPhones.forEach(p => {
      console.log(`   ${p.phoneNumber}${p.groupName ? ' (' + p.groupName + ')' : ''}`)
    })
    console.log('')

  } catch (error) {
    console.error('❌ Error durante la normalización:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

normalizePhoneNumbers()
