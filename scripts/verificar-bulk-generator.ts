#!/usr/bin/env tsx
/**
 * Script para verificar que el bulk generator asigna correctamente temaId
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verificarBulkGenerator() {
  console.log('🔍 Verificando estado del generador bulk...\n')

  // 1. Verificar si existe TemaOficial con id 'LGSS'
  const temaLGSS = await prisma.temaOficial.findFirst({
    where: { id: 'LGSS' }
  })

  console.log('1️⃣ TemaOficial LGSS:')
  if (temaLGSS) {
    console.log(`   ✅ Existe: ${temaLGSS.id} - ${temaLGSS.titulo}`)
  } else {
    console.log('   ⚠️  NO existe TemaOficial con id="LGSS"')
    console.log('   💡 Creando TemaOficial para LGSS...')
    
    const nuevoTemaLGSS = await prisma.temaOficial.create({
      data: {
        id: 'LGSS',
        numero: 0,
        titulo: 'Ley General de la Seguridad Social (RDL 8/2015)',
        descripcion: 'Normativa completa de la Ley General de la Seguridad Social - Real Decreto Legislativo 8/2015',
        categoria: 'ESPECIFICO',
        normativaBase: 'Real Decreto Legislativo 8/2015, de 30 de octubre'
      }
    })
    console.log(`   ✅ Creado: ${nuevoTemaLGSS.id}`)
  }

  // 2. Verificar algunos temas generales
  console.log('\n2️⃣ TemaOficial General (g1):')
  const temaG1 = await prisma.temaOficial.findFirst({
    where: { id: 'g1' }
  })
  if (temaG1) {
    console.log(`   ✅ ${temaG1.id} - ${temaG1.titulo}`)
  } else {
    console.log('   ❌ NO existe')
  }

  // 3. Verificar algunos temas específicos
  console.log('\n3️⃣ TemaOficial Específico (e1):')
  const temaE1 = await prisma.temaOficial.findFirst({
    where: { id: 'e1' }
  })
  if (temaE1) {
    console.log(`   ✅ ${temaE1.id} - ${temaE1.titulo}`)
  } else {
    console.log('   ❌ NO existe')
  }

  // 4. Contar preguntas recientes con y sin temaId
  console.log('\n4️⃣ Preguntas recientes (últimas 24h):')
  const hace24h = new Date()
  hace24h.setHours(hace24h.getHours() - 24)

  const preguntasRecientes = await prisma.question.findMany({
    where: {
      createdAt: { gte: hace24h }
    },
    select: {
      id: true,
      text: true,
      temaId: true,
      temaCodigo: true,
      questionnaireId: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  console.log(`   Total recientes: ${preguntasRecientes.length}`)
  
  const conTemaId = preguntasRecientes.filter(p => p.temaId !== null).length
  const sinTemaId = preguntasRecientes.filter(p => p.temaId === null).length
  
  console.log(`   ✅ Con temaId: ${conTemaId}`)
  console.log(`   ⚠️  Sin temaId: ${sinTemaId}`)

  if (preguntasRecientes.length > 0) {
    console.log('\n   Últimas 5 preguntas:')
    preguntasRecientes.slice(0, 5).forEach((p, i) => {
      const snippet = p.text.substring(0, 60) + '...'
      const temaInfo = p.temaId ? `✅ temaId=${p.temaId}` : `⚠️ SIN temaId`
      console.log(`   ${i + 1}. ${snippet}`)
      console.log(`      ${temaInfo}, temaCodigo=${p.temaCodigo}`)
    })
  }

  console.log('\n✅ Verificación completada')
  console.log('\n💡 Próximos pasos:')
  console.log('   1. Accede a http://localhost:3000/admin/bulk-questions-generator')
  console.log('   2. Genera algunas preguntas de prueba')
  console.log('   3. Vuelve a ejecutar este script para verificar que tienen temaId')
}

verificarBulkGenerator()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
