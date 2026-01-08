import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando secciones huérfanas (sin documento asociado)...')

  // Buscar secciones sin documento
  const orphanSections = await prisma.documentSection.findMany({
    where: {
      documentId: null
    },
    select: {
      id: true,
      title: true,
      documentId: true
    }
  })

  console.log(`📊 Encontradas ${orphanSections.length} secciones huérfanas`)

  if (orphanSections.length === 0) {
    console.log('✅ No hay secciones huérfanas. La base de datos está limpia.')
    return
  }

  console.log('\n🗑️  Eliminando secciones huérfanas...')
  
  const result = await prisma.documentSection.deleteMany({
    where: {
      documentId: null
    }
  })

  console.log(`✅ Eliminadas ${result.count} secciones huérfanas`)
  console.log('✨ Limpieza completada')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
