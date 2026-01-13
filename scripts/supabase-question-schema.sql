-- Minimal schema to restore Questionnaires/Questions without touching other tables.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "Questionnaire" (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,
  theme       TEXT,
  statement   TEXT,
  category    TEXT,
  published   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Question" (
  id              TEXT PRIMARY KEY,
  "questionnaireId" TEXT NOT NULL,
  text            TEXT NOT NULL,
  options         TEXT NOT NULL,
  "correctAnswer" TEXT NOT NULL,
  explanation     TEXT NOT NULL,
  "temaCodigo"   TEXT,
  "temaNumero"   INTEGER,
  "temaParte"    TEXT,
  "temaTitulo"   TEXT,
  difficulty      TEXT,
  "aiReviewed"   BOOLEAN NOT NULL DEFAULT FALSE,
  "aiReviewedAt" TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if tables already existed (idempotent).
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS statement TEXT;
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "questionnaireId" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS options TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "correctAnswer" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "temaCodigo" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "temaNumero" INTEGER;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "temaParte" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "temaTitulo" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "aiReviewed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "aiReviewedAt" TIMESTAMPTZ;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "Question_questionnaireId_idx" ON "Question" ("questionnaireId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Question_questionnaireId_fkey'
  ) THEN
    ALTER TABLE "Question"
      ADD CONSTRAINT "Question_questionnaireId_fkey"
      FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"(id)
      ON DELETE CASCADE;
  END IF;
END $$;
