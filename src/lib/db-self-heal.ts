import { prisma } from '@/lib/prisma'

let ensurePromise: Promise<void> | null = null

async function runEnsureOnce() {
  // This file exists to mitigate production DB drift when migrations
  // have not been applied (common with Supabase + manual SQL changes).
  // Keep it idempotent and minimal.

  // LegalDocument.topic is used by the AI assistant + document manager.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "topic" TEXT;'
  )

  // LegalDocument.active is used as a soft-delete flag in many endpoints.
  // Use NOT NULL + DEFAULT so existing rows become visible immediately.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;'
  )

  // Common legacy drift: missing timestamps/metadata used by ordering and UI.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();'
  )
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();'
  )
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "reference" TEXT;'
  )
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "fileName" TEXT;'
  )
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "fileSize" INT;'
  )
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "LegalDocument" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMPTZ;'
  )

  // Persist temario uploads in DB (serverless filesystem is ephemeral on Vercel).
  // We store the original file bytes as base64 in a side table keyed by TemaArchivo.id.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tema_archivo_blobs (
      tema_archivo_id TEXT PRIMARY KEY,
      mime_type TEXT,
      data_base64 TEXT NOT NULL,
      size_bytes INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT tema_archivo_blobs_tema_archivo_id_fk
        FOREIGN KEY (tema_archivo_id) REFERENCES "TemaArchivo"(id) ON DELETE CASCADE
    );
  `)

  // Track operational metadata that isn't part of the Prisma schema.
  // This avoids schema churn while still allowing admin tooling.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_registration_meta (
      user_id TEXT PRIMARY KEY,
      registration_email_sent BOOLEAN,
      registration_email_sent_at TIMESTAMPTZ,
      last_password_reset_at TIMESTAMPTZ,
      last_password_reset_email_sent BOOLEAN,
      last_password_reset_email_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT user_registration_meta_user_id_fk
        FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
    );
  `)
}

export async function ensureDbSchemaSelfHeal() {
  if (!ensurePromise) {
    ensurePromise = runEnsureOnce().catch((err) => {
      // Allow retries if the first attempt fails (e.g. cold start race)
      ensurePromise = null
      throw err
    })
  }

  return ensurePromise
}
