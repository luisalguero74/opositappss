import { prisma } from '../src/lib/prisma'

async function main() {
  const questionnaireId = 'tema03-cuestionario-01-aass-turno-libre-general-tribunal-constitucional'

  console.log('🔧 Normalizando metadatos para', questionnaireId)

  // Unificar codigo de tema a G03 y parte/título coherentes
  const updatedCodigo = await prisma.question.updateMany({
    where: {
      questionnaireId,
      OR: [
        { temaCodigo: null },
        { temaCodigo: 'T03' },
      ],
    },
    data: {
      temaCodigo: 'G03',
      temaNumero: 3,
      temaParte: 'general',
      temaTitulo: 'Tema 03 - El Tribunal Constitucional',
    },
  })

  console.log('   · Preguntas actualizadas (temaCodigo -> G03):', updatedCodigo.count)

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
    console.error('❌ Error al normalizar metadatos de G03:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
