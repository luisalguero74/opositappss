import { prisma } from '@/lib/prisma'

export async function ensureBoeMonitorTablesExist() {
  // Idempotent, constant SQL only (no user input).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoeMonitorRun" (
      "id" TEXT NOT NULL,
      "job" TEXT NOT NULL,
      "publicationDate" TIMESTAMP(3) NOT NULL,
      "success" BOOLEAN NOT NULL DEFAULT false,
      "scannedItems" INTEGER NOT NULL DEFAULT 0,
      "matchedItems" INTEGER NOT NULL DEFAULT 0,
      "newItems" INTEGER NOT NULL DEFAULT 0,
      "error" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BoeMonitorRun_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "BoeAlertItem" (
      "id" TEXT NOT NULL,
      "runId" TEXT NOT NULL,
      "publicationDate" TIMESTAMP(3) NOT NULL,
      "canonicalKey" TEXT NOT NULL,
      "boeId" TEXT,
      "title" TEXT NOT NULL,
      "urlHtml" TEXT NOT NULL,
      "urlPdf" TEXT,
      "section" TEXT,
      "department" TEXT,
      "epigrafe" TEXT,
      "score" INTEGER NOT NULL DEFAULT 0,
      "reasons" TEXT,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BoeAlertItem_pkey" PRIMARY KEY ("id")
    );

    DO $$
    BEGIN
      ALTER TABLE "BoeAlertItem" ADD CONSTRAINT "BoeAlertItem_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "BoeMonitorRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "BoeMonitorRun_job_publicationDate_key" ON "BoeMonitorRun"("job", "publicationDate");
    CREATE UNIQUE INDEX IF NOT EXISTS "BoeAlertItem_canonicalKey_key" ON "BoeAlertItem"("canonicalKey");

    CREATE INDEX IF NOT EXISTS "BoeMonitorRun_job_createdAt_idx" ON "BoeMonitorRun"("job", "createdAt");
    CREATE INDEX IF NOT EXISTS "BoeMonitorRun_publicationDate_idx" ON "BoeMonitorRun"("publicationDate");

    CREATE INDEX IF NOT EXISTS "BoeAlertItem_isRead_publicationDate_idx" ON "BoeAlertItem"("isRead", "publicationDate");
    CREATE INDEX IF NOT EXISTS "BoeAlertItem_publicationDate_createdAt_idx" ON "BoeAlertItem"("publicationDate", "createdAt");
  `)
}
