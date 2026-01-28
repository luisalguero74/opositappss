#!/usr/bin/env node

// Script de apoyo para preparar migraciones del repositorio contra una BD de STAGING
// sin tocar nunca la base de datos de producción.
//
// Uso previsto (ejemplo):
//   DATABASE_URL="$STAGING_DATABASE_URL" npx prisma migrate dev --name repo_init
//
// Este script NO ejecuta migraciones por sí mismo; simplemente valida que
// existe una variable DATABASE_URL apuntando a una BD que NO sea la de producción
// y muestra instrucciones claras.

import process from 'node:process'

function main() {
  const url = process.env.DATABASE_URL || ''

  if (!url) {
    console.error('[repository-migrate-staging] Falta DATABASE_URL. Configura primero la BD de STAGING.')
    process.exit(1)
  }

  if (url.includes('opositapp') && url.includes('prod')) {
    console.error('[repository-migrate-staging] Parece una URL de PRODUCCIÓN. Aborto por seguridad.')
    process.exit(1)
  }

  console.log('[repository-migrate-staging] DATABASE_URL detectada. Para crear/aplicar migraciones del repositorio, ejecuta por ejemplo:')
  console.log('')
  console.log('  CI=1 PRISMA_TELEMETRY_INFORMATION=none npx prisma migrate dev --name repo_init')
  console.log('')
  console.log('Si solo quieres aplicar el esquema sin migraciones (staging), puedes usar:')
  console.log('')
  console.log('  CI=1 PRISMA_TELEMETRY_INFORMATION=none npx prisma db push --accept-data-loss')
  console.log('')
  console.log('Asegúrate de que esta BD es de STAGING/PRUEBAS antes de continuar.')
}

main()
