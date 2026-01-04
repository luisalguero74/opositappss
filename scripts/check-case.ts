import { prisma } from '../src/lib/prisma'

async function checkCase() {
  const theCase = await prisma.questionnaire.findFirst({
    where: { title: { contains: 'MODELO A 2024' } },
    select: { id: true, title: true, published: true, statement: true }
  })
  
  console.log('Supuesto encontrado:')
  console.log('ID:', theCase?.id)
  console.log('Título:', theCase?.title)
  console.log('Publicado:', theCase?.published)
  console.log('Tiene enunciado:', !!theCase?.statement)
  console.log('Longitud:', theCase?.statement?.length || 0)
  
  await prisma.$disconnect()
}

checkCase()
