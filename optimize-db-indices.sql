-- ============================================
-- OPTIMIZACIÓN DE ÍNDICES PARA REDUCIR EGRESS
-- ============================================
-- Este script crea índices optimizados para las consultas más frecuentes
-- durante la generación de preguntas, reduciendo significativamente el egress

-- Índice compuesto para búsqueda de preguntas por tema y parte
-- Usado en: consultas de preguntas existentes durante generación
CREATE INDEX IF NOT EXISTS idx_question_tema_parte 
ON "Question" (temaCodigo, temaParte, "createdAt" DESC);

-- Índice para búsqueda de preguntas por questionnaireId
-- Usado en: contar preguntas ya generadas en un cuestionario
CREATE INDEX IF NOT EXISTS idx_question_questionnaire 
ON "Question" (questionnaireId, temaCodigo);

-- Índice para búsqueda de preguntas por temaId
-- Usado en: estadísticas y consultas por tema oficial
CREATE INDEX IF NOT EXISTS idx_question_tema_id 
ON "Question" (temaId) WHERE temaId IS NOT NULL;

-- Índice para createdAt (útil para ordenar preguntas recientes)
CREATE INDEX IF NOT EXISTS idx_question_created 
ON "Question" ("createdAt" DESC);

-- Índice para búsqueda de cron jobs activos
CREATE INDEX IF NOT EXISTS idx_cronjobs_status_type 
ON cron_jobs (status, job_type, created_at DESC);

-- Índice para texto de pregunta (búsqueda de duplicados)
-- Usar gin_trgm_ops para búsqueda por similitud textual
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_question_text_trgm 
ON "Question" USING gin (text gin_trgm_ops);

-- Estadísticas de tablas (actualizar para el optimizador)
ANALYZE "Question";
ANALYZE cron_jobs;

-- ============================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ============================================
-- Ejecuta esta consulta para verificar los índices:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Question', 'cron_jobs')
ORDER BY tablename, indexname;
*/
