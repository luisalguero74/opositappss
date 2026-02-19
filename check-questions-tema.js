const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkQuestions() {
  console.log('\n🔍 Verificando preguntas sin tema asignado...\n')
  
  // Preguntas sin temaCodigo
  const withoutTemaCodigo = await prisma.question.count({
    where: { temaCodigo: null }
  })
  
  // Preguntas sin temaId
  const withoutTemaId = await prisma.question.count({
    where: { temaId: null }
  })
  
  // Total de preguntas
  const total = await prisma.question.count()
  
  // Preguntas del banco (sin questionnaireId)
  const bancoQuestions = await prisma.question.count({
    where: { questionnaireId: null }
  })
  
  // Preguntas del banco sin temaCodigo
  const bancoWithoutTema = await prisma.question.count({
    where: { 
      questionnaireId: null,
      temaCodigo: null
    }
  })
  
  console.log(`📊 Total preguntas: ${total}`)
  console.log(`📚 Preguntas del banco: ${bancoQuestions}`)
  console.log(`❌ Sin temaCodigo: ${withoutTemaCodigo}`)
  console.log(`❌ Sin temaId: ${withoutTemaId}`)
  console.log(`⚠️  Banco sin temaCodigo: ${bancoWithoutTema}`)
  
  if (bancoWithoutTema > 0) {
    console.log('\n⚠️  ADVERTENCIA: Hay preguntas del banco sin tema asignado')
    
    // Mostrar ejemplos
    const examples = await prisma.question.findMany({
      where: {
        questionnaireId: null,
        temaCodigo: null
      },
      take: 3,
      select: {
        id: true,
        text: true,
        reviewStatus: true
      }
    })
    
    console.log('\nEjemplos:')
    examples.forEach((q, i) => {
      console.log(`${i + 1}. [${q.reviewStatus}] ${q.text.substring(0, 80)}...`)
    })
  }
  
  await prisma.$disconnect()
}

checkQuestions().catch(console.error)
