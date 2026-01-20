import { prisma } from '../src/lib/prisma'
import { safeParseOptions, getCorrectAnswerLetter } from '../src/lib/answer-normalization'

async function main() {
  const batchSize = 500
  let lastId: string | null = null
  let updated = 0
  let unchanged = 0
  const problematic: { id: string; correctAnswer: string; options: string }[] = []

  console.log('🔎 Normalizando Question.correctAnswer a letras A/B/C/D...')

  for (;;) {
    const questions = await prisma.question.findMany({
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
    })

    if (questions.length === 0) break

    for (const q of questions) {
      const rawCorrect = String(q.correctAnswer ?? '')
      const options = safeParseOptions(q.options as any)

      if (!rawCorrect.trim()) {
        problematic.push({ id: q.id, correctAnswer: rawCorrect, options: String(q.options) })
        continue
      }

      const letter = getCorrectAnswerLetter(rawCorrect, options)
      if (!letter) {
        problematic.push({ id: q.id, correctAnswer: rawCorrect, options: String(q.options) })
        continue
      }

      const newValue = letter.toUpperCase()
      if (q.correctAnswer === newValue) {
        unchanged++
        continue
      }

      await prisma.question.update({
        where: { id: q.id },
        data: { correctAnswer: newValue },
      })
      updated++
    }

    lastId = questions[questions.length - 1]?.id ?? null
    console.log(`  · Procesadas ${updated + unchanged} preguntas hasta id=${lastId}`)
  }

  console.log('✅ Normalización completada')
  console.log(`  - Actualizadas: ${updated}`)
  console.log(`  - Sin cambios:  ${unchanged}`)
  console.log(`  - Problemáticas (sin letra deducible): ${problematic.length}`)

  if (problematic.length > 0) {
    console.log('⚠️ Primeras 20 problemáticas para revisión manual:')
    for (const p of problematic.slice(0, 20)) {
      console.log(`    · id=${p.id} correctAnswer="${p.correctAnswer}" options=${p.options}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Error en normalización de correctAnswer:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
