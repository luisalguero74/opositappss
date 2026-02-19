-- ============================================================================
-- MIGRACIÓN: Sistema de Banco de Preguntas por Tema
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Hacer questionnaireId OPCIONAL en Question
ALTER TABLE "Question" ALTER COLUMN "questionnaireId" DROP NOT NULL;

-- 2. Agregar temaId a Question
ALTER TABLE "Question" ADD COLUMN "temaId" TEXT;

-- 3. Crear tabla de relación N:N entre Questionnaire y Question
CREATE TABLE "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- 4. Agregar foreign keys
ALTER TABLE "QuestionnaireQuestion" 
    ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" 
    FOREIGN KEY ("questionnaireId") 
    REFERENCES "Questionnaire"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE "QuestionnaireQuestion" 
    ADD CONSTRAINT "QuestionnaireQuestion_questionId_fkey" 
    FOREIGN KEY ("questionId") 
    REFERENCES "Question"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- 5. Agregar foreign key de Question a TemaOficial
ALTER TABLE "Question" 
    ADD CONSTRAINT "Question_temaId_fkey" 
    FOREIGN KEY ("temaId") 
    REFERENCES "TemaOficial"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- 6. Crear índices para optimizar consultas
CREATE INDEX "Question_temaId_idx" ON "Question"("temaId");
CREATE INDEX "Question_questionnaireId_idx" ON "Question"("questionnaireId");
CREATE INDEX "QuestionnaireQuestion_questionnaireId_idx" ON "QuestionnaireQuestion"("questionnaireId");
CREATE INDEX "QuestionnaireQuestion_questionId_idx" ON "QuestionnaireQuestion"("questionId");

-- 7. Crear constraint único para evitar duplicados en QuestionnaireQuestion
CREATE UNIQUE INDEX "QuestionnaireQuestion_questionnaireId_questionId_key" 
    ON "QuestionnaireQuestion"("questionnaireId", "questionId");

-- ============================================================================
-- ✅ COMPLETADO
-- ============================================================================
-- Después de ejecutar este SQL:
-- 1. Ejecuta: npx ts-node scripts/migrate-questions-to-temas.ts
-- 2. Verifica en Prisma Studio
-- ============================================================================
