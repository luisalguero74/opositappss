import fs from 'fs'
import { PrismaClient } from '@prisma/client'

// Asegura que process.env.DATABASE_URL tenga valor leyendo de .env.local
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return

  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) {
    console.error('.env.local no existe; no se puede leer DATABASE_URL.')
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf8')
  const line = content
    .split('\n')
    .find((l) => l.trim().startsWith('DATABASE_URL='))

  if (!line) {
    console.error('No se ha encontrado DATABASE_URL en .env.local.')
    process.exit(1)
  }

  let value = line.slice('DATABASE_URL='.length).trim()

  // Quitar comillas envolventes si las hubiera
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim()
  }

  process.env.DATABASE_URL = value
}

ensureDatabaseUrl()

const prisma = new PrismaClient()

async function main() {
  const admins = await prisma.user.findMany({
    where: {
      OR: [
        { role: { equals: 'admin', mode: 'insensitive' } },
        { role: { equals: 'ADMIN', mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, role: true, active: true },
  })

  if (!admins.length) {
    console.log('No se han encontrado usuarios admin.')
  } else {
    console.log('Usuarios admin encontrados:')
    for (const a of admins) {
      console.log(`- ${a.email} (role=${a.role}, active=${a.active})`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
