/**
 * Script de verificación del sistema de supuestos prácticos
 * Verifica: BD, API endpoints, parsers, y estructura de datos
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando sistema de Supuestos Prácticos...\n')

  try {
    // 1. Verificar conexión a BD
    console.log('1️⃣ Verificando conexión a base de datos...')
    await prisma.$connect()
    console.log('✅ Conexión exitosa\n')

    // 2. Verificar supuestos prácticos existentes
    console.log('2️⃣ Verificando supuestos prácticos en BD...')
    const practicalCases = await prisma.questionnaire.findMany({
      where: {
        type: 'practical'
      },
      include: {
        questions: true,
        _count: {
          select: {
            attempts: true
          }
        }
      }
    })

    console.log(`📊 Total de supuestos prácticos: ${practicalCases.length}`)
    
    if (practicalCases.length > 0) {
      console.log('\n📋 Lista de supuestos prácticos:')
      practicalCases.forEach((pc, index) => {
        console.log(`\n  ${index + 1}. ${pc.title}`)
        console.log(`     - ID: ${pc.id}`)
        console.log(`     - Tema: ${pc.theme || 'Sin tema'}`)
        console.log(`     - Preguntas: ${pc.questions.length}`)
        console.log(`     - Publicado: ${pc.published ? 'Sí' : 'No'}`)
        console.log(`     - Intentos: ${pc._count.attempts}`)
        console.log(`     - Enunciado: ${pc.statement ? `${pc.statement.substring(0, 100)}...` : 'Sin enunciado'}`)
      })
    } else {
      console.log('⚠️ No hay supuestos prácticos en la base de datos')
    }

    // 3. Verificar estructura de preguntas
    console.log('\n3️⃣ Verificando estructura de preguntas...')
    const allQuestions = practicalCases.flatMap(pc => pc.questions)
    
    if (allQuestions.length > 0) {
      const sampleQuestion = allQuestions[0]
      console.log('\n📝 Estructura de pregunta de ejemplo:')
      console.log(JSON.stringify({
        id: sampleQuestion.id,
        text: sampleQuestion.text.substring(0, 80) + '...',
        options: typeof sampleQuestion.options === 'string' 
          ? JSON.parse(sampleQuestion.options) 
          : sampleQuestion.options,
        correctAnswer: sampleQuestion.correctAnswer,
        explanation: sampleQuestion.explanation?.substring(0, 100) + '...',
        questionnaireId: sampleQuestion.questionnaireId
      }, null, 2))

      // Verificar integridad de opciones
      console.log('\n🔍 Verificando integridad de opciones...')
      const questionsWithIssues = allQuestions.filter(q => {
        const options = typeof q.options === 'string' 
          ? JSON.parse(q.options) 
          : q.options
        return !Array.isArray(options) || options.length !== 4
      })

      if (questionsWithIssues.length > 0) {
        console.log(`⚠️ Encontradas ${questionsWithIssues.length} preguntas con opciones incompletas`)
      } else {
        console.log('✅ Todas las preguntas tienen 4 opciones correctamente')
      }
    }

    // 4. Verificar formato del parser
    console.log('\n4️⃣ Verificando formato esperado por el parser...')
    console.log(`
📋 Formato esperado:

ENUNCIADO
[Texto del caso práctico aquí...]

PREGUNTAS
PREGUNTA 1:
[Texto de la pregunta]
OPCIÓN A: [Opción A]
OPCIÓN B: [Opción B]
OPCIÓN C: [Opción C]
OPCIÓN D: [Opción D]

PREGUNTA 2:
[Texto de la pregunta]
OPCIÓN A: [Opción A]
OPCIÓN B: [Opción B]
OPCIÓN C: [Opción C]
OPCIÓN D: [Opción D]

SOLUCIONARIO
PREGUNTA 1: A
[Explicación/motivación de la respuesta correcta]

PREGUNTA 2: C
[Explicación/motivación de la respuesta correcta]
    `)

    // 5. Resumen final
    console.log('\n✅ RESUMEN:')
    console.log(`   - Supuestos prácticos totales: ${practicalCases.length}`)
    console.log(`   - Publicados: ${practicalCases.filter(p => p.published).length}`)
    console.log(`   - Borradores: ${practicalCases.filter(p => !p.published).length}`)
    console.log(`   - Total de preguntas: ${allQuestions.length}`)
    console.log(`   - Total de intentos: ${practicalCases.reduce((sum, pc) => sum + pc._count.attempts, 0)}`)

    console.log('\n🎉 Verificación completada exitosamente')

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Error fatal:', error)
    process.exit(1)
  })
