import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('$aC468eUi)n7', 10)

  await prisma.user.upsert({
    where: { email: 'luisalguero74@gmail.com' },
    update: {},
    create: {
      email: 'luisalguero74@gmail.com',
      password: hashedPassword,
      role: 'admin'
    }
  })

  console.log('Admin user created')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())