#!/usr/bin/env node

// Devuelve una DATABASE_URL adecuada para `prisma migrate deploy`.
// En este proyecto, la URL de producción suele apuntar al pooler (6543).
// Para aumentar estabilidad en CLI, forzamos:
// - sslmode=require
// - pgbouncer=true
// - connection_limit=1
// y NO imprimimos nada más (se usa en sustitución de comandos).

import { execFileSync } from 'node:child_process'

function loadFromEnvFiles() {
  const out = execFileSync(process.execPath, ['scripts/get-db-url.mjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'ignore'],
    env: process.env,
  })
    .toString('utf8')
    .trim()
    .replace(/\n+$/, '')

  return out || null
}

function main() {
  const raw = process.env.DATABASE_URL || loadFromEnvFiles()
  if (!raw) {
    console.error('No DB url found')
    process.exit(1)
  }

  try {
    const u = new URL(raw)

    // Si viene del pooler, dejamos host/puerto tal cual y añadimos params útiles.
    if (!u.searchParams.get('sslmode')) u.searchParams.set('sslmode', 'require')
    if (!u.searchParams.get('pgbouncer')) u.searchParams.set('pgbouncer', 'true')
    if (!u.searchParams.get('connection_limit')) u.searchParams.set('connection_limit', '1')

    process.stdout.write(u.toString())
    return
  } catch {
    process.stdout.write(String(raw))
  }
}

main()
