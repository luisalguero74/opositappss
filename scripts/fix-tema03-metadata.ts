import { prisma } from '../src/lib/prisma'

async function main() {
  const questionnaireId = 'tema03-cuestionario-01-aass-turno-libre-especifico'

  console.log('🔧 Normalizando metadatos para', questionnaireId)

  // Unificar codigo de tema a E03
  const updatedCodigo = await prisma.question.updateMany({
    where: {
      questionnaireId,
      OR: [
        { temaCodigo: null },
        { temaCodigo: 'T03' },
      ],
    },
    data: {
      temaCodigo: 'E03',
      temaNumero: 3,
      temaParte: 'especifico',
      temaTitulo: 'Tema 03 - Afiliación, inscripción e inscripción de empresas',
    },
  })

  console.log('   · Preguntas actualizadas (temaCodigo -> E03):', updatedCodigo.count)

  // Normalizar dificultad "alta" a "dificil"
  const updatedDifficulty = await prisma.question.updateMany({
    where: {
      questionnaireId,
      difficulty: 'alta',
    },
    data: {
      difficulty: 'dificil',
    },
  })

  console.log('   · Preguntas actualizadas (difficulty alta -> dificil):', updatedDifficulty.count)
}

main()
  .catch((err) => {
    console.error('❌ Error al normalizar metadatos de TEMA 03:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
