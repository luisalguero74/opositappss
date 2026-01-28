#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function printUsage() {
  console.log(`\nUsage:\n  DATABASE_URL='postgresql://...' node scripts/seed-repository-staging.mjs\n\nWhat it does:\n  - Upserts one RepoFolder (code temario-especifico)\n  - Ensures one RepoDocument pointing to a storagePath\n\nOptional env vars:\n  REPO_SEED_FOLDER_CODE (default: temario-especifico)\n  REPO_SEED_FOLDER_NAME (default: TEMARIO ESPECÍFICO)\n  REPO_SEED_DOC_TITLE    (default: Tema 05 - Gestión recaudatoria (nuevas))\n  REPO_SEED_DOC_FILENAME (default: TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf)\n  REPO_SEED_DOC_STORAGE_PATH (default: repo/temario-especifico/TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf)\n  REPO_SEED_DOC_ALLOW_DOWNLOAD (default: true)\n  REPO_SEED_DOC_IS_ACTIVE (default: true)\n`)
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  const databaseUrl = requireEnv('DATABASE_URL')

  const folderCode = process.env.REPO_SEED_FOLDER_CODE || 'temario-especifico'
  const folderName = process.env.REPO_SEED_FOLDER_NAME || 'TEMARIO ESPECÍFICO'

  const docTitle = process.env.REPO_SEED_DOC_TITLE || 'Tema 05 - Gestión recaudatoria (nuevas)'
  const docFileName = process.env.REPO_SEED_DOC_FILENAME || 'TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf'
  const docStoragePath =
    process.env.REPO_SEED_DOC_STORAGE_PATH ||
    'repo/temario-especifico/TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf'

  const allowDownload = (process.env.REPO_SEED_DOC_ALLOW_DOWNLOAD || 'true') === 'true'
  const isActive = (process.env.REPO_SEED_DOC_IS_ACTIVE || 'true') === 'true'

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  })

  try {
    const folder = await prisma.repoFolder.upsert({
      where: { code: folderCode },
      update: {
        name: folderName,
      },
      create: {
        code: folderCode,
        name: folderName,
        description: 'Semilla mínima para pruebas end-to-end del repositorio',
      },
    })

    const existingDoc = await prisma.repoDocument.findFirst({
      where: { storagePath: docStoragePath },
      select: { id: true },
    })

    const doc = existingDoc
      ? await prisma.repoDocument.update({
          where: { id: existingDoc.id },
          data: {
            folderId: folder.id,
            title: docTitle,
            fileName: docFileName,
            allowDownload,
            isActive,
          },
        })
      : await prisma.repoDocument.create({
          data: {
            folderId: folder.id,
            title: docTitle,
            fileName: docFileName,
            storagePath: docStoragePath,
            allowDownload,
            isActive,
          },
        })

    console.log('Seed OK')
    console.log(`RepoFolder: ${folder.code} (${folder.id})`)
    console.log(`RepoDocument: ${doc.id}`)
    console.log(`storagePath: ${doc.storagePath}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
