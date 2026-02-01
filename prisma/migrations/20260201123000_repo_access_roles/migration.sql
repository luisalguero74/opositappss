-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "RepoRole" AS ENUM ('NONE', 'READER', 'EDITOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "RepoAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddColumn
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "repoRole" "RepoRole" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE IF NOT EXISTS "RepoAccessRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "desiredRole" "RepoRole" NOT NULL,
  "status" "RepoAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "reason" TEXT,

  CONSTRAINT "RepoAccessRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "RepoAccessRequest" ADD CONSTRAINT "RepoAccessRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RepoAccessRequest" ADD CONSTRAINT "RepoAccessRequest_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepoAccessRequest_status_createdAt_idx" ON "RepoAccessRequest" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "RepoAccessRequest_userId_status_idx" ON "RepoAccessRequest" ("userId", "status");
