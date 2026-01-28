#!/usr/bin/env node

// Ejecuta `prisma db push` en modo no interactivo y sin mostrar secretos.
// Requiere que DATABASE_URL ya esté configurada en el entorno.
// Ejemplo de uso (en tu terminal, sin pegar la URL en el comando):
//   export DATABASE_URL="..."
//   node scripts/prisma-db-push-safe.mjs

import { spawn } from 'node:child_process'
import dns from 'node:dns'

function main() {
  const rawUrl = process.env.DATABASE_URL || ''
  if (!rawUrl) {
    console.error('[prisma-db-push-safe] Falta DATABASE_URL en el entorno (no la imprimo por seguridad).')
    process.exit(1)
  }

  // Ajustes automáticos para Supabase Pooler: requiere SSL y modo PgBouncer.
  // Evita bloqueos y errores típicos al usar el puerto 6543.
  let url = rawUrl
  try {
    const u = new URL(rawUrl)
    if (u.hostname.includes('pooler.supabase.com') || u.port === '6543') {
      if (!u.searchParams.get('sslmode')) {
        u.searchParams.set('sslmode', 'require')
      }
      if (!u.searchParams.get('pgbouncer')) {
        u.searchParams.set('pgbouncer', 'true')
      }
      // Reducimos el límite de conexiones para evitar saturar el pooler.
      if (!u.searchParams.get('connection_limit')) {
        u.searchParams.set('connection_limit', '1')
      }
      url = u.toString()
    }
  } catch {
    // Si no se puede parsear, dejamos el valor tal cual y el diagnóstico de abajo lo detectará.
    url = rawUrl
  }

  // Diagnóstico seguro (sin imprimir password)
  try {
    const u = new URL(url)
    const safeUser = u.username || '(none)'
    const safeDb = u.pathname.replace(/^\//, '') || '(none)'
    console.log('[prisma-db-push-safe] Target:', `${u.hostname}:${u.port || '(default)'}`, 'user=', safeUser, 'db=', safeDb)

    if (u.hostname.includes('pooler.supabase.com') && safeUser === 'postgres') {
      console.warn(
        '[prisma-db-push-safe] WARNING: Estás usando el pooler (6543) con usuario "postgres". En Supabase pooler suele ser necesario usar usuario del tipo "postgres.<project_ref>". Copia la connection string del pooler tal cual desde Supabase.'
      )
    }
    dns.lookup(u.hostname, { all: true }, (err, addrs) => {
      if (err) {
        console.error('[prisma-db-push-safe] DNS error:', err.code)
      } else {
        console.log('[prisma-db-push-safe] DNS ok:', addrs.map((a) => a.address).join(', '))
      }
    })
  } catch {
    console.error('[prisma-db-push-safe] DATABASE_URL no es una URL válida. Revisa comillas y URL-encoding de la contraseña.')
    process.exit(1)
  }

  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', '--accept-data-loss'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: url,
        CI: '1',
        PRISMA_TELEMETRY_INFORMATION: 'none',
      },
    }
  )

  child.on('exit', (code) => {
    process.exit(code ?? 1)
  })
}

main()
