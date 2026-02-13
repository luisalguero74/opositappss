-- Add review workflow metadata to questions.

DO $$ BEGIN
  CREATE TYPE "QuestionOrigin" AS ENUM ('UNKNOWN', 'CRON', 'JSON', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestionReviewStatus" AS ENUM ('PENDING', 'VALIDATED', 'QUARANTINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "origin" "QuestionOrigin" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "reviewStatus" "QuestionReviewStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "Question_reviewStatus_origin_createdAt_idx"
  ON "Question" ("reviewStatus", "origin", "createdAt");
