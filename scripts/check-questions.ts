import { prisma } from '../src/lib/prisma'

async function main() {
  const totalQuestions = await prisma.generatedQuestion.count()
  const byDifficulty = await prisma.generatedQuestion.groupBy({
    by: ['difficulty'],
    _count: true
  })
  
  const byTopic = await prisma.generatedQuestion.groupBy({
    by: ['topic'],
    _count: true,
    orderBy: {
      topic: 'asc'
    }
  })
  
  console.log('\n📊 ESTADÍSTICAS DE PREGUNTAS GENERADAS')
  console.log('=====================================\n')
  console.log(`✅ Total de preguntas: ${totalQuestions}\n`)
  
  console.log('Por dificultad:')
  byDifficulty.forEach(d => {
    console.log(`  ${d.difficulty}: ${d._count} preguntas`)
  })
  
  console.log('\nPor tema:')
  byTopic.forEach(t => {
    console.log(`  ${t.topic}: ${t._count} preguntas`)
  })
  
  // Mostrar algunos ejemplos
  const examples = await prisma.generatedQuestion.findMany({
    take: 3,
    include: {
      document: {
        select: {
          title: true,
          topic: true
        }
      }
    }
  })
  
  console.log('\n📝 EJEMPLOS DE PREGUNTAS:\n')
  examples.forEach((q, i) => {
    console.log(`${i + 1}. ${q.text}`)
    const options = JSON.parse(q.options)
    options.forEach((opt: string, idx: number) => {
      const letter = String.fromCharCode(65 + idx)
      const marker = q.correctAnswer === letter ? ' ✓' : ''
      console.log(`   ${letter}) ${opt}${marker}`)
    })
    console.log(`   Dificultad: ${q.difficulty}`)
    console.log(`   Tema: ${q.topic}`)
    console.log()
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
