/**
 * Script para cargar números de teléfono permitidos desde un archivo
 * Los números deben estar en formato: +34XXXXXXXXX
 * 
 * Uso:
 * 1. Crea un archivo 'allowed-phones.txt' con los números (uno por línea)
 * 2. Ejecuta: npx tsx scripts/load-allowed-phones.ts
 */

import { prisma } from '../src/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function loadAllowedPhones() {
  const filePath = path.join(process.cwd(), 'allowed-phones.txt')
  
  console.log('📱 Cargando números de teléfono permitidos...\n')

  // Verificar si existe el archivo
  if (!fs.existsSync(filePath)) {
    console.log('⚠️  No se encontró el archivo allowed-phones.txt')
    console.log('📝 Creando archivo de ejemplo...\n')
    
    const exampleContent = `# Números de teléfono permitidos para registro
# Formato: +34XXXXXXXXX (uno por línea)
# Puedes añadir comentarios con # y separar con nombre de grupo usando |

# Grupo WhatsApp Principal
+34600000001|Grupo Principal
+34600000002|Grupo Principal

# Grupo WhatsApp Secundario
+34700000001|Grupo Secundario
+34700000002|Grupo Secundario

# Sin grupo especificado
+34800000001
`
    
    fs.writeFileSync(filePath, exampleContent)
    console.log('✅ Archivo de ejemplo creado: allowed-phones.txt')
    console.log('📝 Edita este archivo con los números reales y ejecuta el script de nuevo.\n')
    return
  }

  // Leer archivo
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  let added = 0
  let skipped = 0
  let errors = 0

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Saltar líneas vacías y comentarios
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Parsear línea (puede tener formato: +34XXXXXXXXX|Nombre del Grupo)
    const parts = trimmed.split('|')
    const phoneNumber = parts[0].trim().replace(/[\s-]/g, '') // Eliminar espacios y guiones
    const groupName = parts[1]?.trim() || null

    // Validar formato
    if (!/^\+34\d{9}$/.test(phoneNumber)) {
      console.log(`❌ Formato inválido: ${trimmed}`)
      errors++
      continue
    }

    try {
      // Intentar crear el registro (usar upsert para evitar duplicados)
      await prisma.allowedPhoneNumber.upsert({
        where: { phoneNumber },
        update: { groupName }, // Si existe, actualizar el nombre del grupo
        create: { phoneNumber, groupName }
      })
      
      console.log(`✅ ${phoneNumber}${groupName ? ` (${groupName})` : ''}`)
      added++
    } catch (error) {
      console.log(`⚠️  Error al insertar ${phoneNumber}: ${error}`)
      skipped++
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Números añadidos/actualizados: ${added}`)
  console.log(`   ⚠️  Números omitidos: ${skipped}`)
  console.log(`   ❌ Errores de formato: ${errors}`)
  
  // Mostrar total en base de datos
  const total = await prisma.allowedPhoneNumber.count()
  console.log(`\n📱 Total de números permitidos en BD: ${total}\n`)
}

loadAllowedPhones()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
