import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orphanIds = [
    'cmjolmnbq0014knqht37majlo',
    'cmjonu3im001vknqh4f5us833',
    'cmjoo2w6x002hknqhh8b59cjk',
    'cmjopa90s0081knqh1u7oeiw0',
    'cmjopo2v600atknqhr50r3d4q',
    'cmjq8nogd00eyknm74pegny81',
    'cmjq8noh100h9knm7m1vfbzrj',
    'cmjq8np1q03h5knm7c0fmf3p6'
  ]

  console.log(`🗑️  Eliminando ${orphanIds.length} documentos huérfanos...`)

  for (const id of orphanIds) {
    try {
      // Primero eliminar secciones
      await prisma.documentSection.deleteMany({
        where: { documentId: id }
      })
      
      // Luego eliminar preguntas generadas
      await prisma.generatedQuestion.deleteMany({
        where: { documentId: id }
      })
      
      // Finalmente eliminar el documento
      const deleted = await prisma.legalDocument.delete({
        where: { id }
      })
      
      console.log(`✅ Eliminado: ${deleted.title} (${deleted.fileName})`)
    } catch (error: any) {
      console.log(`⚠️  Error eliminando ${id}: ${error.message}`)
    }
  }

  console.log('✨ Limpieza completada')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
