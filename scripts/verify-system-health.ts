#!/usr/bin/env tsx
/**
 * Script de verificación completa del sistema
 * Verifica: BD, APIs, archivos, integridad de datos
 */

import { PrismaClient } from '@prisma/client'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function verificarSistema() {
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA\n')
  console.log('=' + '='.repeat(60) + '\n')

  let errores = 0
  let advertencias = 0

  // 1. Verificar conexión a BD
  console.log('📊 1. Conexión a PostgreSQL')
  try {
    await prisma.$connect()
    console.log('   ✅ Conexión exitosa\n')
  } catch (error) {
    console.log('   ❌ Error de conexión:', error)
    errores++
    return
  }

  // 2. Verificar modelos TemaOficial
  console.log('📚 2. Modelo TemaOficial')
  try {
    const temas = await prisma.temaOficial.findMany({
      include: { archivos: true }
    })
    console.log(`   ✅ ${temas.length} temas encontrados`)
    
    const general = temas.filter(t => t.categoria === 'general')
    const especifico = temas.filter(t => t.categoria === 'especifico')
    console.log(`   📖 General: ${general.length}`)
    console.log(`   📘 Específico: ${especifico.length}`)
    
    const conArchivos = temas.filter(t => t.archivos.length > 0)
    console.log(`   📁 Temas con archivos: ${conArchivos.length}/${temas.length}\n`)
    
    if (temas.length === 0) {
      advertencias++
      console.log('   ⚠️  ADVERTENCIA: No hay temas en la base de datos\n')
    }
  } catch (error: any) {
    console.log('   ❌ Error al leer temas:', error.message)
    errores++
  }

  // 3. Verificar archivos físicos
  console.log('💾 3. Archivos Físicos en Disco')
  const directorios = [
    'documentos-temario/general',
    'documentos-temario/especifico'
  ]

  for (const dir of directorios) {
    const path = join(process.cwd(), dir)
    if (existsSync(path)) {
      const archivos = readdirSync(path).filter(f => !f.startsWith('.'))
      console.log(`   ✅ ${dir}: ${archivos.length} archivos`)
    } else {
      console.log(`   ⚠️  ${dir}: No existe`)
      advertencias++
    }
  }
  console.log()

  // 4. Verificar integridad (BD vs Disco)
  console.log('🔗 4. Integridad BD ↔ Disco')
  try {
    const archivosDB = await prisma.temaArchivo.findMany({
      include: { tema: true }
    })

    let integridadOK = 0
    let faltantes = 0

    for (const archivo of archivosDB) {
      const path = join(
        process.cwd(),
        'documentos-temario',
        archivo.tema.categoria,
        archivo.nombre
      )
      if (existsSync(path)) {
        integridadOK++
      } else {
        console.log(`   ⚠️  Falta: ${archivo.nombre} (${archivo.tema.id})`)
        faltantes++
      }
    }

    console.log(`   ✅ Archivos OK: ${integridadOK}/${archivosDB.length}`)
    if (faltantes > 0) {
      console.log(`   ⚠️  Archivos faltantes: ${faltantes}`)
      advertencias += faltantes
    }
    console.log()
  } catch (error: any) {
    console.log('   ❌ Error verificando integridad:', error.message)
    errores++
  }

  // 5. Verificar otros modelos críticos
  console.log('🗃️  5. Otros Modelos de Datos')
  try {
    const counts = {
      usuarios: await prisma.user.count(),
      documentos: await prisma.legalDocument.count(),
      preguntas: await prisma.question.count(),
      cuestionarios: await prisma.questionnaire.count()
    }

    console.log(`   👥 Usuarios: ${counts.usuarios}`)
    console.log(`   📜 Documentos legales: ${counts.documentos}`)
    console.log(`   ❓ Preguntas: ${counts.preguntas}`)
    console.log(`   📋 Cuestionarios: ${counts.cuestionarios}\n`)
  } catch (error: any) {
    console.log('   ❌ Error leyendo modelos:', error.message)
    errores++
  }

  // 6. Verificar servidor en ejecución
  console.log('🌐 6. Servidor de Desarrollo')
  try {
    const response = await fetch('http://localhost:3000')
    if (response.ok) {
      console.log('   ✅ Servidor respondiendo en http://localhost:3000\n')
    } else {
      console.log('   ⚠️  Servidor responde con status:', response.status, '\n')
      advertencias++
    }
  } catch (error) {
    console.log('   ❌ Servidor no responde (¿está corriendo?)\n')
    errores++
  }

  // Resumen final
  console.log('=' + '='.repeat(60))
  console.log('\n📊 RESUMEN')
  console.log(`   ✅ Checks exitosos`)
  console.log(`   ⚠️  Advertencias: ${advertencias}`)
  console.log(`   ❌ Errores críticos: ${errores}`)
  
  if (errores === 0 && advertencias === 0) {
    console.log('\n🎉 SISTEMA 100% OPERATIVO')
  } else if (errores === 0) {
    console.log('\n✅ Sistema operativo con advertencias menores')
  } else {
    console.log('\n⚠️  Sistema con errores que requieren atención')
  }

  await prisma.$disconnect()
  process.exit(errores > 0 ? 1 : 0)
}

verificarSistema().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
