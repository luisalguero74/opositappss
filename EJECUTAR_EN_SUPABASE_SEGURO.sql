-- ============================================================================
-- MIGRACIÓN SEGURA: Solo aplica lo que no existe
-- ============================================================================

-- 1. Hacer questionnaireId OPCIONAL (si aún no lo es)
DO $$ 
BEGIN
    ALTER TABLE "Question" ALTER COLUMN "questionnaireId" DROP NOT NULL;
EXCEPTION 
    WHEN others THEN NULL;
END $$;

-- 2. Agregar temaId si no existe
DO $$ 
BEGIN
    ALTER TABLE "Question" ADD COLUMN "temaId" TEXT;
EXCEPTION 
    WHEN duplicate_column THEN NULL;
END $$;

-- 3. Crear tabla QuestionnaireQuestion si no existe
CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- 4. Agregar foreign keys (solo si no existen)
DO $$ 
BEGIN
    ALTER TABLE "QuestionnaireQuestion" 
        ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" 
        FOREIGN KEY ("questionnaireId") 
        REFERENCES "Questionnaire"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE "QuestionnaireQuestion" 
        ADD CONSTRAINT "QuestionnaireQuestion_questionId_fkey" 
        FOREIGN KEY ("questionId") 
        REFERENCES "Question"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE "Question" 
        ADD CONSTRAINT "Question_temaId_fkey" 
        FOREIGN KEY ("temaId") 
        REFERENCES "TemaOficial"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Crear índices (solo si no existen)
CREATE INDEX IF NOT EXISTS "Question_temaId_idx" ON "Question"("temaId");
CREATE INDEX IF NOT EXISTS "Question_questionnaireId_idx" ON "Question"("questionnaireId");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_questionnaireId_idx" ON "QuestionnaireQuestion"("questionnaireId");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_questionId_idx" ON "QuestionnaireQuestion"("questionId");

-- 6. Crear constraint único (solo si no existe)
DO $$ 
BEGIN
    CREATE UNIQUE INDEX "QuestionnaireQuestion_questionnaireId_questionId_key" 
        ON "QuestionnaireQuestion"("questionnaireId", "questionId");
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- ✅ LISTO - Este SQL es seguro, ignora lo que ya existe
-- ============================================================================
