import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const practicalCases = await prisma.questionnaire.findMany({
    where: { type: 'practical' },
    include: {
      questions: {
        orderBy: { id: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  })

  for (const pc of practicalCases) {
    console.log(`\n📚 ${pc.title}`)
    console.log(`   ID: ${pc.id}`)
    console.log(`   Preguntas: ${pc.questions.length}`)
    console.log(`   Creado: ${pc.createdAt}`)
    
    if (pc.questions.length > 0) {
      console.log('\n   Preguntas:')
      for (const q of pc.questions) {
        console.log(`   ${q.id.substring(0, 8)}... - ${q.text.substring(0, 60)}...`)
        console.log(`      Opciones: ${q.options.length}`)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
