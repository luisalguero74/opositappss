#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import pg from 'pg'

function getMigrateUrl() {
  const out = execFileSync(process.execPath, ['scripts/get-db-url-for-prisma-migrate.mjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'ignore'],
    env: process.env,
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

  const { Client } = pg
  const client = new Client({
    connectionString: url,
    ssl: {
      // Supabase pooler commonly presents a chain that fails strict validation in some local setups.
      // This script is only for ops verification; production runtime uses Prisma.
      rejectUnauthorized: false,
    },
  })

  await client.connect()

  const tables = await client.query(
    `select
      to_regclass('public."BoeMonitorRun"') as boe_monitor_run,
      to_regclass('public."BoeAlertItem"') as boe_alert_item;`,
  )

  let migrations = null
  try {
    migrations = await client.query(
      `select migration_name, finished_at, applied_steps_count, rolled_back_at
       from _prisma_migrations
       where migration_name = '20260206093000_boe_monitor'
       order by finished_at desc
       limit 3;`,
    )
  } catch {
    migrations = null
  }

  await client.end()

  const row = tables.rows?.[0] || {}
  console.log('[verify-boe-monitor] BoeMonitorRun:', row.boe_monitor_run || null)
  console.log('[verify-boe-monitor] BoeAlertItem :', row.boe_alert_item || null)
  if (migrations?.rows) {
    console.log('[verify-boe-monitor] Prisma migration rows:', migrations.rows.length)
    if (migrations.rows.length) {
      console.log('[verify-boe-monitor] Latest:', migrations.rows[0])
    }
  } else {
    console.log('[verify-boe-monitor] Prisma migration rows: (unavailable)')
  }
}

main().catch((e) => {
  console.error('[verify-boe-monitor] ERROR:', e?.message || e)
  process.exit(1)
})
