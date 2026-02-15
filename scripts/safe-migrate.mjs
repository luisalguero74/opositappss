#!/usr/bin/env node
/**
 * Safe Prisma Migration Script
 * 
 * Automatically handles:
 * - Connection to session pooler if needed
 * - Proper parameters for PgBouncer compatibility
 * - Verification before deployment
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run') || args.includes('-n')
const isForce = args.includes('--force') || args.includes('-f')

function log(msg, level = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m'
  }
  const reset = '\x1b[0m'
  console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${msg}`)
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { 
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    })
  } catch (err) {
    if (!options.ignoreError) {
      throw err
    }
    return null
  }
}

function getDbUrl() {
  try {
    const url = exec('node scripts/get-db-url-for-prisma-migrate.mjs', { silent: true })
    return url?.trim()
  } catch (err) {
    log('Failed to get database URL from script', 'error')
    return null
  }
}

function checkPrismaStatus(dbUrl) {
  log('Checking current migration status...', 'info')
  
  try {
    const output = exec(
      `DATABASE_URL="${dbUrl}" DIRECT_URL="${dbUrl}" npx prisma migrate status`,
      { silent: true, ignoreError: true }
    )
    
    log(output, 'info')
    return output
  } catch (err) {
    log('Could not check migration status', 'warn')
    return null
  }
}

function deployMigrations(dbUrl) {
  log('Deploying migrations...', 'info')
  
  const cmd = `DATABASE_URL="${dbUrl}" DIRECT_URL="${dbUrl}" npx prisma migrate deploy`
  
  if (isDryRun) {
    log('[DRY RUN] Would execute:', 'warn')
    log(cmd, 'warn')
    return
  }
  
  try {
    exec(cmd)
    log('✅ Migrations deployed successfully!', 'success')
  } catch (err) {
    log('❌ Migration deployment failed', 'error')
    throw err
  }
}

function main() {
  log('🚀 Starting safe Prisma migration...', 'info')
  log('', 'info')
  
  // Get database URL
  log('Step 1: Getting database URL...', 'info')
  const dbUrl = getDbUrl()
  
  if (!dbUrl) {
    log('❌ Could not determine database URL', 'error')
    process.exit(1)
  }
  
  // Mask password in logs
  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@')
  log(`Using URL: ${maskedUrl}`, 'info')
  log('', 'info')
  
  // Check current status
  log('Step 2: Checking migration status...', 'info')
  const status = checkPrismaStatus(dbUrl)
  log('', 'info')
  
  // Deploy migrations
  log('Step 3: Deploying migrations...', 'info')
  
  if (!isForce && status && status.includes('up to date')) {
    log('ℹ️  Database is already up to date. Use --force to redeploy anyway.', 'warn')
    return
  }
  
  deployMigrations(dbUrl)
  log('', 'info')
  
  // Verify
  log('Step 4: Verifying deployment...', 'info')
  checkPrismaStatus(dbUrl)
  
  log('', 'info')
  log('✅ Migration process completed!', 'success')
}

// Usage info
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/safe-migrate.mjs [options]

Options:
  --dry-run, -n    Show what would be executed without making changes
  --force, -f      Force redeployment even if already up to date
  --help, -h       Show this help message

Examples:
  node scripts/safe-migrate.mjs              # Deploy migrations
  node scripts/safe-migrate.mjs --dry-run    # Preview without changes
  node scripts/safe-migrate.mjs --force      # Force redeploy
`)
  process.exit(0)
}

try {
  main()
} catch (err) {
  log(`Fatal error: ${err.message}`, 'error')
  process.exit(1)
}
