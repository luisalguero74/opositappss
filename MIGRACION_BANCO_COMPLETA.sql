-- ============================================================================
-- MIGRACIÓN COMPLETA AL BANCO DE PREGUNTAS
-- ============================================================================
-- Este script:
-- 1. Asigna temaId a todas las preguntas basándose en temaCodigo
-- 2. Libera las preguntas al banco (questionnaireId = NULL)
-- 3. Mantiene las relaciones N:N en QuestionnaireQuestion
-- ============================================================================

-- PASO 1: Asignar temaId basado en temaCodigo
-- TemaOficial.id tiene formato "TEMA_GENERAL_1", "TEMA_ESPECIFICO_1", etc.
-- Question.temaCodigo tiene formato "TEMA_GENERAL_1", "TEMA_ESPECIFICO_1", etc.
UPDATE "Question" q
SET "temaId" = t.id
FROM "TemaOficial" t
WHERE q."temaCodigo" = t.id
  AND q."temaId" IS NULL;

-- PASO 2: Verificar cuántas preguntas se vincularon
DO $$
DECLARE
  vinculadas INTEGER;
  sin_vincular INTEGER;
BEGIN
  SELECT COUNT(*) INTO vinculadas FROM "Question" WHERE "temaId" IS NOT NULL;
  SELECT COUNT(*) INTO sin_vincular FROM "Question" WHERE "temaId" IS NULL;
  
  RAISE NOTICE '✅ Preguntas vinculadas a tema: %', vinculadas;
  RAISE NOTICE '⚠️  Preguntas sin tema (revisar): %', sin_vincular;
END $$;

-- PASO 3: Liberar preguntas al banco (mantener relaciones N:N)
-- Esto es seguro porque QuestionnaireQuestion ya tiene las relaciones
UPDATE "Question"
SET "questionnaireId" = NULL
WHERE "questionnaireId" IS NOT NULL;

-- PASO 4: Verificación final
DO $$
DECLARE
  total INTEGER;
  banco INTEGER;
  con_tema INTEGER;
  relaciones INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM "Question";
  SELECT COUNT(*) INTO banco FROM "Question" WHERE "questionnaireId" IS NULL;
  SELECT COUNT(*) INTO con_tema FROM "Question" WHERE "temaId" IS NOT NULL;
  SELECT COUNT(*) INTO relaciones FROM "QuestionnaireQuestion";
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RESULTADOS DE LA MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total preguntas: %', total;
  RAISE NOTICE 'Preguntas en banco: %', banco;
  RAISE NOTICE 'Preguntas con temaId: %', con_tema;
  RAISE NOTICE 'Relaciones N:N preservadas: %', relaciones;
  RAISE NOTICE '========================================';
  
  IF banco = total THEN
    RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Todas las preguntas en el banco';
  ELSE
    RAISE WARNING '⚠️  Algunas preguntas no se migraron';
  END IF;
END $$;

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================================================
-- Las preguntas ahora están en el banco y disponibles para:
-- - Crear cuestionarios personalizados desde el wizard
-- - Test a la carta con todas las preguntas disponibles
-- - Mantienen su vínculo histórico con cuestionarios originales vía N:N
-- ============================================================================
