-- Ejecuta esto en Supabase SQL Editor para crear todas las tablas

-- User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "password" TEXT,
    "phoneNumber" TEXT UNIQUE,
    "emailVerified" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Account table
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
);

-- Session table
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- VerificationToken table
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")
);

-- Topic table
CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL UNIQUE,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "area" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Questionnaire table  
CREATE TABLE IF NOT EXISTS "Questionnaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "theme" TEXT,
    "statement" TEXT,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Questionnaire_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL
);

-- Question table
CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionnaireId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" TEXT,
    "legalFoundation" TEXT,
    "legalReferences" TEXT,
    "practicalMotivation" TEXT,
    "linkedCaseId" TEXT,
    CONSTRAINT "Question_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE
);

-- Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "stripeCustomerId" TEXT UNIQUE,
    "stripeSubscriptionId" TEXT UNIQUE,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- LegalDocument table
CREATE TABLE IF NOT EXISTS "LegalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "embedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AllowedPhone table (CRÍTICO para login)
CREATE TABLE IF NOT EXISTS "AllowedPhone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserAnswer table
CREATE TABLE IF NOT EXISTS "UserAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "UserAnswer_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE,
    CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE
);

-- QuestionnaireAttempt table
CREATE TABLE IF NOT EXISTS "QuestionnaireAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "QuestionnaireAttempt_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE
);

-- Insertar teléfonos permitidos iniciales
INSERT INTO "AllowedPhone" (id, "phoneNumber", name, notes, active) VALUES
    (gen_random_uuid()::text, '+34666666666', 'Admin Test', 'Número de prueba admin', true),
    (gen_random_uuid()::text, '+34777777777', 'Usuario Test', 'Número de prueba usuario', true),
    (gen_random_uuid()::text, '666666666', 'Admin Test (sin +34)', 'Formato sin prefijo', true),
    (gen_random_uuid()::text, '777777777', 'Usuario Test (sin +34)', 'Formato sin prefijo', true)
ON CONFLICT ("phoneNumber") DO NOTHING;

-- Indexes para mejorar performance
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Question_questionnaireId_idx" ON "Question"("questionnaireId");
CREATE INDEX IF NOT EXISTS "Questionnaire_topicId_idx" ON "Questionnaire"("topicId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "LegalDocument_documentType_idx" ON "LegalDocument"("documentType");
CREATE INDEX IF NOT EXISTS "AllowedPhone_phoneNumber_idx" ON "AllowedPhone"("phoneNumber");
CREATE INDEX IF NOT EXISTS "UserAnswer_userId_idx" ON "UserAnswer"("userId");
CREATE INDEX IF NOT EXISTS "QuestionnaireAttempt_userId_idx" ON "QuestionnaireAttempt"("userId");

-- Trigger para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas que tienen updatedAt
DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questionnaire_updated_at ON "Questionnaire";
CREATE TRIGGER update_questionnaire_updated_at BEFORE UPDATE ON "Questionnaire"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topic_updated_at ON "Topic";
CREATE TRIGGER update_topic_updated_at BEFORE UPDATE ON "Topic"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_updated_at ON "Subscription";
CREATE TRIGGER update_subscription_updated_at BEFORE UPDATE ON "Subscription"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_document_updated_at ON "LegalDocument";
CREATE TRIGGER update_legal_document_updated_at BEFORE UPDATE ON "LegalDocument"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
