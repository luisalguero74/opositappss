import { prisma } from '../src/lib/prisma'

async function main() {
  const questionnaireId = 'tema02-especifico-funcionarios-militares-justicia-seguro-escolar-ver1'

  console.log('🔍 Buscando cuestionario', questionnaireId)
  const qn = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId },
  })

  if (!qn) {
    console.log('❌ Cuestionario no encontrado')
    return
  }

  console.log('✅ Cuestionario encontrado:')
  console.log('   · id       :', qn.id)
  console.log('   · title    :', qn.title)
  console.log('   · published:', qn.published)
  console.log('   · type     :', qn.type)

  const questions = await prisma.question.findMany({
    where: { questionnaireId },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })

  const total = await prisma.question.count({ where: { questionnaireId } })

  console.log('\n📊 Resumen de preguntas vinculadas:')
  console.log('   · Total:', total)

  if (questions.length === 0) {
    console.log('   · No hay preguntas vinculadas a este cuestionario.')
  } else {
    for (const q of questions) {
      console.log('\n   · Pregunta id:', q.id)
      console.log('     text       :', q.text.slice(0, 80) + (q.text.length > 80 ? '…' : ''))
      console.log('     correctAns :', q.correctAnswer)
      console.log('     temaCodigo :', q.temaCodigo)
      console.log('     temaNumero :', q.temaNumero)
      console.log('     temaParte  :', q.temaParte)
      console.log('     temaTitulo :', q.temaTitulo)
      console.log('     difficulty :', q.difficulty)
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Error debug TEMA 02:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
