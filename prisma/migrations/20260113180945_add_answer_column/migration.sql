-- AddColumn answer to UserAnswer if not exists
ALTER TABLE "UserAnswer" ADD COLUMN IF NOT EXISTS "answer" TEXT NOT NULL DEFAULT '';

-- Remove the default constraint
ALTER TABLE "UserAnswer" ALTER COLUMN "answer" DROP DEFAULT;
