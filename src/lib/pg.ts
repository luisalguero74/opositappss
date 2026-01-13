import 'server-only'

import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __opositapp_pg_pool__: Pool | undefined
  // eslint-disable-next-line no-var
  var __opositapp_userAnswer_answer_col__: 'answer' | 'selectedAnswer' | undefined
  // eslint-disable-next-line no-var
  var __opositapp_userAnswer_has_attemptId__: boolean | undefined
}

function shouldUseSsl() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production')
}

export function getPgPool(): Pool {
  if (!global.__opositapp_pg_pool__) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }

    // SSL configuration for Vercel/Production
    let sslConfig: any = undefined
    if (shouldUseSsl()) {
      sslConfig = {
        rejectUnauthorized: false,
        // Support both standard certificates and self-signed
        checkServerIdentity: () => {
          return undefined
        }
      }
    }

    global.__opositapp_pg_pool__ = new Pool({
      connectionString,
      ssl: sslConfig,
      // Additional connection options for stability
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // Retry logic for transient failures
      maxRetries: 3
    })

    // Handle pool errors gracefully
    global.__opositapp_pg_pool__.on('error', (err) => {
      console.error('[PG_POOL_ERROR]', err)
    })
  }
  return global.__opositapp_pg_pool__
}

export async function getUserAnswerColumnInfo(pool: Pool): Promise<{
  answerColumn: 'answer' | 'selectedAnswer'
  hasAttemptId: boolean
}> {
  if (global.__opositapp_userAnswer_answer_col__ && global.__opositapp_userAnswer_has_attemptId__ !== undefined) {
    return {
      answerColumn: global.__opositapp_userAnswer_answer_col__,
      hasAttemptId: global.__opositapp_userAnswer_has_attemptId__
    }
  }

  // Primary method: information_schema introspection.
  // Some managed Postgres poolers restrict access to information_schema; if it fails,
  // fall back to probing columns directly.
  let answerColumn: 'answer' | 'selectedAnswer' = 'answer'
  let hasAttemptId = false

  try {
    const res = await pool.query(
      "select column_name from information_schema.columns where table_schema='public' and table_name='UserAnswer'"
    )
    const cols = new Set(res.rows.map(r => String(r.column_name)))
    answerColumn = cols.has('selectedAnswer') ? 'selectedAnswer' : 'answer'
    hasAttemptId = cols.has('attemptId')
  } catch {
    // Fallback: probe column existence without relying on catalog permissions.
    // These SELECTs will fail with an undefined_column error if the column doesn't exist.
    try {
      await pool.query('select "selectedAnswer" from "UserAnswer" limit 1')
      answerColumn = 'selectedAnswer'
    } catch {
      // If selectedAnswer doesn't exist, assume answer exists.
      answerColumn = 'answer'
    }

    try {
      await pool.query('select "attemptId" from "UserAnswer" limit 1')
      hasAttemptId = true
    } catch {
      hasAttemptId = false
    }
  }

  global.__opositapp_userAnswer_answer_col__ = answerColumn
  global.__opositapp_userAnswer_has_attemptId__ = hasAttemptId

  return { answerColumn, hasAttemptId }
}
