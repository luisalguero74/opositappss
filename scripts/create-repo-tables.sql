BEGIN;

CREATE TABLE IF NOT EXISTS "RepoFolder" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepoFolder_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepoFolder_code_key'
  ) THEN
    ALTER TABLE "RepoFolder" ADD CONSTRAINT "RepoFolder_code_key" UNIQUE ("code");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepoFolder_parentId_fkey'
  ) THEN
    ALTER TABLE "RepoFolder"
      ADD CONSTRAINT "RepoFolder_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "RepoFolder"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "RepoDocument" (
  "id" TEXT NOT NULL,
  "folderId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "storageBucket" TEXT,
  "fileType" TEXT,
  "fileSize" INTEGER,
  "pages" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "allowDownload" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepoDocument_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepoDocument_folderId_fkey'
  ) THEN
    ALTER TABLE "RepoDocument"
      ADD CONSTRAINT "RepoDocument_folderId_fkey"
      FOREIGN KEY ("folderId") REFERENCES "RepoFolder"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "RepoDocument_folderId_idx" ON "RepoDocument"("folderId");

CREATE TABLE IF NOT EXISTS "RepoDocumentAccessLog" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepoDocumentAccessLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepoDocumentAccessLog_documentId_fkey'
  ) THEN
    ALTER TABLE "RepoDocumentAccessLog"
      ADD CONSTRAINT "RepoDocumentAccessLog_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "RepoDocument"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'RepoDocumentAccessLog_userId_fkey'
  ) THEN
    ALTER TABLE "RepoDocumentAccessLog"
      ADD CONSTRAINT "RepoDocumentAccessLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "RepoDocumentAccessLog_documentId_createdAt_idx" ON "RepoDocumentAccessLog"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "RepoDocumentAccessLog_userId_createdAt_idx" ON "RepoDocumentAccessLog"("userId", "createdAt");

COMMIT;
