/**
 * Script de Verificación de Integridad del Sistema
 * Verifica que todas las funcionalidades críticas funcionen correctamente
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface VerificationResult {
  category: string
  test: string
  status: 'OK' | 'ERROR' | 'WARNING'
  message: string
  details?: any
}

const results: VerificationResult[] = []

function addResult(category: string, test: string, status: 'OK' | 'ERROR' | 'WARNING', message: string, details?: any) {
  results.push({ category, test, status, message, details })
}

async function verifyDatabase() {
  console.log('\n🔍 Verificando Base de Datos...\n')

  try {
    // Verificar conexión
    await prisma.$connect()
    addResult('Database', 'Connection', 'OK', 'Conexión a PostgreSQL establecida')

    // Verificar tablas críticas
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Question', model: prisma.question },
      { name: 'Questionnaire', model: prisma.questionnaire },
      { name: 'LegalDocument', model: prisma.legalDocument },
      { name: 'TemaOficial', model: prisma.temaOficial },
      { name: 'TemaArchivo', model: prisma.temaArchivo },
      { name: 'Subscription', model: prisma.subscription },
      { name: 'ExamSimulation', model: prisma.examSimulation },
      { name: 'VirtualClassroom', model: prisma.virtualClassroom }
    ]

    for (const table of tables) {
      try {
        const count = await (table.model as any).count()
        addResult('Database', `Table: ${table.name}`, 'OK', `Registros: ${count}`, { count })
      } catch (error: any) {
        addResult('Database', `Table: ${table.name}`, 'ERROR', error.message)
      }
    }

    // Verificar integridad de datos del temario
    const temasConArchivos = await prisma.temaOficial.findMany({
      include: {
        archivos: true
      }
    })

    const temasCompletos = temasConArchivos.filter(t => t.archivos.length > 0)
    const totalArchivos = temasConArchivos.reduce((sum, t) => sum + t.archivos.length, 0)

    addResult('Temario', 'Temas con archivos', 'OK', `${temasCompletos.length} de ${temasConArchivos.length} temas tienen archivos`, {
      temasCompletos: temasCompletos.length,
      totalTemas: temasConArchivos.length,
      totalArchivos
    })

    if (temasCompletos.length === 0) {
      addResult('Temario', 'Archivos subidos', 'WARNING', 'No hay archivos de temario subidos')
    }

    // Verificar documentos legales
    const docs = await prisma.legalDocument.count()
    if (docs === 0) {
      addResult('Documents', 'Legal Documents', 'WARNING', 'No hay documentos legales en la base de datos')
    } else {
      addResult('Documents', 'Legal Documents', 'OK', `${docs} documentos legales disponibles`)
    }

    // Verificar preguntas
    const questions = await prisma.question.count()
    const questionsWithTema = await prisma.question.count({
      where: { temaCodigo: { not: null } }
    })

    addResult('Questions', 'Total Questions', 'OK', `${questions} preguntas en total`)
    addResult('Questions', 'Questions with Tema', 'OK', `${questionsWithTema} preguntas vinculadas a temas`)

    // Verificar cuestionarios
    const questionnaires = await prisma.questionnaire.count()
    const publishedQuestionnaires = await prisma.questionnaire.count({
      where: { published: true }
    })

    addResult('Questionnaires', 'Total', 'OK', `${questionnaires} cuestionarios totales`)
    addResult('Questionnaires', 'Published', questionnaires > 0 ? 'OK' : 'WARNING', `${publishedQuestionnaires} cuestionarios publicados`)

    // Verificar usuarios
    const users = await prisma.user.count()
    const admins = await prisma.user.count({ where: { role: 'admin' } })

    addResult('Users', 'Total Users', 'OK', `${users} usuarios registrados`)
    addResult('Users', 'Admins', admins > 0 ? 'OK' : 'ERROR', `${admins} administradores`)

  } catch (error: any) {
    addResult('Database', 'General', 'ERROR', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function verifyFileSystem() {
  console.log('\n📁 Verificando Sistema de Archivos...\n')

  const fs = require('fs')
  const path = require('path')

  const criticalPaths = [
    { path: 'documentos-temario/general', type: 'Temario General' },
    { path: 'documentos-temario/especifico', type: 'Temario Específico' },
    { path: 'documentos-temario/biblioteca', type: 'Biblioteca Legal' },
    { path: 'public', type: 'Public Assets' },
    { path: '.next', type: 'Next.js Build' }
  ]

  for (const { path: dirPath, type } of criticalPaths) {
    const fullPath = path.join(process.cwd(), dirPath)
    if (fs.existsSync(fullPath)) {
      try {
        const files = fs.readdirSync(fullPath)
        addResult('FileSystem', type, 'OK', `${files.length} archivos encontrados`, { path: dirPath })
      } catch (error: any) {
        addResult('FileSystem', type, 'WARNING', `Directorio existe pero no se puede leer: ${error.message}`)
      }
    } else {
      addResult('FileSystem', type, 'WARNING', `Directorio no existe: ${dirPath}`)
    }
  }
}

async function verifyAPIEndpoints() {
  console.log('\n🌐 Verificando Endpoints API...\n')

  const criticalAPIs = [
    '/api/auth/session',
    '/api/biblioteca-legal',
    '/api/temario/config',
    '/api/questionnaires',
    '/api/admin/statistics'
  ]

  for (const endpoint of criticalAPIs) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`)
      if (response.ok || response.status === 401 || response.status === 403) {
        // 401/403 son esperados para endpoints protegidos
        addResult('API', endpoint, 'OK', `HTTP ${response.status}`)
      } else {
        addResult('API', endpoint, 'WARNING', `HTTP ${response.status}`)
      }
    } catch (error: any) {
      addResult('API', endpoint, 'ERROR', `No disponible: ${error.message}`)
    }
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 RESULTADOS DE VERIFICACIÓN DE INTEGRIDAD DEL SISTEMA')
  console.log('='.repeat(80) + '\n')

  const categories = [...new Set(results.map(r => r.category))]
  
  let totalOK = 0
  let totalWarnings = 0
  let totalErrors = 0

  for (const category of categories) {
    console.log(`\n📂 ${category}`)
    console.log('-'.repeat(80))

    const categoryResults = results.filter(r => r.category === category)
    
    for (const result of categoryResults) {
      const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`${icon} ${result.test}: ${result.message}`)
      
      if (result.details) {
        console.log(`   ${JSON.stringify(result.details)}`)
      }

      if (result.status === 'OK') totalOK++
      else if (result.status === 'WARNING') totalWarnings++
      else totalErrors++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📈 RESUMEN')
  console.log('='.repeat(80))
  console.log(`✅ Verificaciones OK: ${totalOK}`)
  console.log(`⚠️  Advertencias: ${totalWarnings}`)
  console.log(`❌ Errores: ${totalErrors}`)
  console.log('='.repeat(80) + '\n')

  if (totalErrors > 0) {
    console.log('❌ SISTEMA CON ERRORES CRÍTICOS')
    process.exit(1)
  } else if (totalWarnings > 0) {
    console.log('⚠️  SISTEMA FUNCIONAL CON ADVERTENCIAS')
    process.exit(0)
  } else {
    console.log('✅ SISTEMA COMPLETAMENTE FUNCIONAL')
    process.exit(0)
  }
}

async function main() {
  console.log('🚀 Iniciando Verificación de Integridad del Sistema OpositAPP')
  console.log('Fecha:', new Date().toLocaleString('es-ES'))

  await verifyDatabase()
  await verifyFileSystem()
  await verifyAPIEndpoints()
  
  printResults()
}

main().catch(error => {
  console.error('❌ Error fatal durante la verificación:', error)
  process.exit(1)
})
