import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * SCRIPT DE MIGRACIÓN DE DATOS
 * 
 * Fase 1: Vincular preguntas existentes a TemaOficial
 * Fase 2: Crear relaciones QuestionnaireQuestion (N:N)
 */

async function main() {
  console.log('🔄 Iniciando migración de datos...\n')

  // =============================================================================
  // FASE 1: VINCULAR PREGUNTAS A TEMAS OFICIALES
  // =============================================================================
  console.log('📊 FASE 1: Vinculando preguntas a TemaOficial...')
  
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      temaCodigo: true,
      temaNumero: true,
      temaTitulo: true,
    }
  })
  
  console.log(`   Total preguntas a migrar: ${questions.length}`)
  
  let migrated = 0
  let errors = 0
  let withoutTema = 0
  
  for (const question of questions) {
    try {
      // Determinar categoría por el código
      if (question.temaNumero) {
        const categoria = question.temaCodigo?.startsWith('g') 
          ? 'general' 
          : question.temaCodigo?.startsWith('e')
            ? 'especifico'
            : null
        
        if (!categoria) {
          withoutTema++
          continue
        }
        
        // Buscar tema oficial
        const tema = await prisma.temaOficial.findFirst({
          where: {
            numero: question.temaNumero,
            categoria: categoria
          }
        })
        
        if (tema) {
          // Actualizar pregunta con temaId
          await prisma.question.update({
            where: { id: question.id },
            data: { temaId: tema.id }
          })
          migrated++
          
          if (migrated % 100 === 0) {
            console.log(`   ✅ Migradas ${migrated} preguntas...`)
          }
        } else {
          console.log(`   ⚠️  Tema no encontrado: ${categoria} ${question.temaNumero}`)
          withoutTema++
        }
      } else {
        withoutTema++
      }
    } catch (error) {
      console.error(`   ❌ Error migrando pregunta ${question.id}:`, error)
      errors++
    }
  }
  
  console.log(`\n   📊 Resumen Fase 1:`)
  console.log(`      ✅ Migradas: ${migrated}`)
  console.log(`      ⚠️  Sin tema: ${withoutTema}`)
  console.log(`      ❌ Errores: ${errors}`)
  
  // =============================================================================
  // FASE 2: CREAR RELACIONES N:N (QuestionnaireQuestion)
  // =============================================================================
  console.log('\n🔗 FASE 2: Creando relaciones QuestionnaireQuestion (N:N)...')
  
  const questionnaires = await prisma.questionnaire.findMany({
    include: {
      questions: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })
  
  console.log(`   Cuestionarios a procesar: ${questionnaires.length}`)
  
  let linksCreated = 0
  
  for (const questionnaire of questionnaires) {
    console.log(`\n   📝 Procesando: ${questionnaire.title}`)
    
    let order = 1
    for (const question of questionnaire.questions) {
      try {
        // Verificar si ya existe la relación
        const existing = await prisma.questionnaireQuestion.findUnique({
          where: {
            questionnaireId_questionId: {
              questionnaireId: questionnaire.id,
              questionId: question.id
            }
          }
        })
        
        if (!existing) {
          await prisma.questionnaireQuestion.create({
            data: {
              questionnaireId: questionnaire.id,
              questionId: question.id,
              order: order
            }
          })
          linksCreated++
        }
        order++
      } catch (error) {
        console.error(`      ❌ Error creando enlace:`, error)
      }
    }
    
    console.log(`      ✅ ${questionnaire.questions.length} preguntas enlazadas`)
  }
  
  console.log(`\n   📊 Resumen Fase 2:`)
  console.log(`      ✅ Enlaces creados: ${linksCreated}`)
  
  // =============================================================================
  // VERIFICACIÓN FINAL
  // =============================================================================
  console.log('\n✨ VERIFICACIÓN FINAL:')
  
  const withTema = await prisma.question.count({
    where: { temaId: { not: null } }
  })
  
  const totalLinks = await prisma.questionnaireQuestion.count()
  
  console.log(`   ✅ Preguntas vinculadas a temas: ${withTema}`)
  console.log(`   ✅ Enlaces N:N creados: ${totalLinks}`)
  
  console.log('\n✅ MIGRACIÓN COMPLETADA CON ÉXITO\n')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('❌ Error en migración:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
