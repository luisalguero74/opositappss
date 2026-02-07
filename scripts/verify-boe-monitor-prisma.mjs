#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

function getMigrateUrl() {
  const env = { ...process.env }
  // Ensure we don't accidentally pick up a DATABASE_URL injected by Prisma's env loading.
  delete env.DATABASE_URL

  const out = execFileSync(process.execPath, ['scripts/get-db-url-for-prisma-migrate.mjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'ignore'],
    env,
  })
    .toString('utf8')
    .trim()
  return out
}

async function main() {
  const url = getMigrateUrl()
  if (!url) {
    console.error('No DB URL found')
    process.exit(1)
  }

  const { PrismaClient } = await import('@prisma/client')

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  })

  try {
    const tables = await prisma.$queryRawUnsafe(
      `select
        to_regclass('public."BoeMonitorRun"')::text as boe_monitor_run,
        to_regclass('public."BoeAlertItem"')::text as boe_alert_item;`,
    )

    let migrations = null
    try {
      migrations = await prisma.$queryRawUnsafe(
        `select migration_name, finished_at, applied_steps_count, rolled_back_at
         from _prisma_migrations
         where migration_name = '20260206093000_boe_monitor'
         order by finished_at desc
         limit 3;`,
      )
    } catch (e) {
      migrations = null
    }

    const row = Array.isArray(tables) ? tables[0] : null
    console.log('[verify-boe-monitor-prisma] BoeMonitorRun:', row?.boe_monitor_run || null)
    console.log('[verify-boe-monitor-prisma] BoeAlertItem :', row?.boe_alert_item || null)
    if (Array.isArray(migrations)) {
      console.log('[verify-boe-monitor-prisma] Prisma migration rows:', migrations.length)
      if (migrations.length) console.log('[verify-boe-monitor-prisma] Latest:', migrations[0])
    } else {
      console.log('[verify-boe-monitor-prisma] Prisma migration rows: (unavailable)')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('[verify-boe-monitor-prisma] ERROR:', e?.message || e)
  process.exit(1)
})
