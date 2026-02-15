#!/usr/bin/env node
/**
 * Get DB URL for Prisma Migrate operations
 * 
 * Solves the "prepared statement already exists" issue with PgBouncer
 * by adding pgbouncer=true, statement_cache_size=0, and connection_limit=1
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getEnvFiles() {
  const rootDir = path.join(__dirname, '..')
  const envFiles = [
    '.env.production.local',
    '.env.local',
    '.env.production',
    '.env'
  ]

  return envFiles
    .map(file => path.join(rootDir, file))
    .filter(file => fs.existsSync(file))
}

function loadEnv() {
  const env = {}
  
  for (const envFile of getEnvFiles()) {
    const content = fs.readFileSync(envFile, 'utf-8')
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        
        if (!env[key]) {
          env[key] = value
        }
      }
    }
  }
  
  return env
}

function addMigrateParams(url) {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    const params = urlObj.searchParams
    
    // Add PgBouncer compatibility params
    params.set('pgbouncer', 'true')
    params.set('statement_cache_size', '0')
    params.set('connection_limit', '1')
    
    return urlObj.toString()
  } catch (err) {
    console.error('Invalid URL:', err.message)
    return null
  }
}

function convertToSessionPooler(url) {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    
    // If using transaction pooler (:6543), convert to session pooler (:5432)
    if (urlObj.port === '6543') {
      urlObj.port = '5432'
      console.error('[INFO] Converted :6543 (transaction) to :5432 (session pooler)', { to: 'stderr' })
    }
    
    return urlObj.toString()
  } catch (err) {
    console.error('Invalid URL:', err.message)
    return null
  }
}

function main() {
  const env = loadEnv()
  
  // Priority: POSTGRES_URL_NON_POOLING > DIRECT_URL > DATABASE_URL
  let url = env.POSTGRES_URL_NON_POOLING || env.DIRECT_URL || env.DATABASE_URL || env.POSTGRES_PRISMA_URL
  
  if (!url) {
    console.error('ERROR: No database URL found in environment files')
    process.exit(1)
  }
  
  // Convert to session pooler if needed
  url = convertToSessionPooler(url)
  
  // Add migration-safe parameters
  url = addMigrateParams(url)
  
  if (!url) {
    console.error('ERROR: Failed to process database URL')
    process.exit(1)
  }
  
  // Output URL to stdout (safe for shell capture)
  console.log(url)
}

main()
