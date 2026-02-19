-- ============================================================================
-- POBLAR TEMAS OFICIALES FALTANTES
-- ============================================================================
-- Este script crea todos los temas del temario oficial que faltan
-- Para la oposición de Administración de la Seguridad Social
-- ============================================================================

-- TEMAS GENERALES (G1 - G23)
INSERT INTO "TemaOficial" (id, numero, titulo, descripcion, categoria, "createdAt", "updatedAt")
VALUES
  ('g1', 1, 'La Seguridad Social en la Constitución', 'La Seguridad Social en la Constitución española de 1978. El texto refundido de la Ley General de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g2', 2, 'Campo de aplicación del sistema', 'Campo de aplicación del sistema de Seguridad Social. Regímenes general y especiales.', 'general', NOW(), NOW()),
  ('g3', 3, 'Normas sobre afiliación', 'Normas sobre afiliación. Altas y bajas en el régimen general. Procedimiento y efectos.', 'general', NOW(), NOW()),
  ('g4', 4, 'La cotización a la Seguridad Social', 'La cotización a la Seguridad Social: normas comunes del sistema. La liquidación de cuotas.', 'general', NOW(), NOW()),
  ('g5', 5, 'Régimen general de cotización', 'El régimen general de la Seguridad Social. Bases y tipos de cotización.', 'general', NOW(), NOW()),
  ('g6', 6, 'Acción protectora del régimen general', 'Acción protectora del régimen general de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g7', 7, 'Incapacidad temporal', 'Incapacidad temporal: concepto, situaciones protegidas y beneficiarios.', 'general', NOW(), NOW()),
  ('g8', 8, 'Maternidad y paternidad', 'Prestaciones por maternidad, paternidad y cuidado de menores.', 'general', NOW(), NOW()),
  ('g9', 9, 'Incapacidad permanente', 'Incapacidad permanente: concepto, grados y beneficiarios.', 'general', NOW(), NOW()),
  ('g10', 10, 'Lesiones permanentes no invalidantes', 'Lesiones permanentes no invalidantes.', 'general', NOW(), NOW()),
  ('g11', 11, 'Jubilación', 'Jubilación: concepto, modalidades y requisitos.', 'general', NOW(), NOW()),
  ('g12', 12, 'Muerte y supervivencia', 'Prestaciones por muerte y supervivencia.', 'general', NOW(), NOW()),
  ('g13', 13, 'Prestaciones familiares', 'Prestaciones familiares de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g14', 14, 'Protección por desempleo', 'Protección por desempleo: nivel contributivo y asistencial.', 'general', NOW(), NOW()),
  ('g15', 15, 'Régimen especial agrario', 'Régimen especial de trabajadores por cuenta propia o autónomos: campo de aplicación.', 'general', NOW(), NOW()),
  ('g16', 16, 'Sistemas especiales', 'Sistemas especiales de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g17', 17, 'Gestión de la Seguridad Social', 'Gestión de la Seguridad Social. Entidades gestoras y servicios comunes.', 'general', NOW(), NOW()),
  ('g18', 18, 'Colaboración en la gestión', 'Colaboración en la gestión de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g19', 19, 'Recaudación de cuotas', 'Recaudación de cuotas de la Seguridad Social.', 'general', NOW(), NOW()),
  ('g20', 20, 'Infracciones y sanciones', 'Infracciones y sanciones en el orden social.', 'general', NOW(), NOW()),
  ('g21', 21, 'Procedimiento administrativo', 'Procedimiento administrativo en materia de Seguridad Social.', 'general', NOW(), NOW()),
  ('g22', 22, 'Revisión de actos', 'Revisión de actos en vía administrativa.', 'general', NOW(), NOW()),
  ('g23', 23, 'Impugnación jurisdiccional', 'Impugnación jurisdiccional en el orden social.', 'general', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- TEMAS ESPECÍFICOS (E1 - E13)
INSERT INTO "TemaOficial" (id, numero, titulo, descripcion, categoria, "createdAt", "updatedAt")
VALUES
  ('e1', 1, 'Legislación básica específica I', 'Legislación y normativa específica aplicable I.', 'especifico', NOW(), NOW()),
  ('e2', 2, 'Legislación básica específica II', 'Legislación y normativa específica aplicable II.', 'especifico', NOW(), NOW()),
  ('e3', 3, 'Legislación básica específica III', 'Legislación y normativa específica aplicable III.', 'especifico', NOW(), NOW()),
  ('e4', 4, 'Cotización específica', 'Normas específicas de cotización y recaudación.', 'especifico', NOW(), NOW()),
  ('e5', 5, 'Prestaciones específicas I', 'Prestaciones específicas del sistema de Seguridad Social I.', 'especifico', NOW(), NOW()),
  ('e6', 6, 'Prestaciones específicas II', 'Prestaciones específicas del sistema de Seguridad Social II.', 'especifico', NOW(), NOW()),
  ('e7', 7, 'Gestión específica I', 'Gestión administrativa específica I.', 'especifico', NOW(), NOW()),
  ('e8', 8, 'Gestión específica II', 'Gestión administrativa específica II.', 'especifico', NOW(), NOW()),
  ('e9', 9, 'Procedimientos específicos I', 'Procedimientos administrativos específicos I.', 'especifico', NOW(), NOW()),
  ('e10', 10, 'Procedimientos específicos II', 'Procedimientos administrativos específicos II.', 'especifico', NOW(), NOW()),
  ('e11', 11, 'Aplicaciones informáticas', 'Sistemas de información y aplicaciones informáticas de la Seguridad Social.', 'especifico', NOW(), NOW()),
  ('e12', 12, 'Organización administrativa', 'Organización administrativa de la Seguridad Social.', 'especifico', NOW(), NOW()),
  ('e13', 13, 'Atención al ciudadano', 'Atención al ciudadano y calidad en la gestión pública.', 'especifico', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- VERIFICAR CREACIÓN
SELECT COUNT(*) as temas_creados, categoria
FROM "TemaOficial"
GROUP BY categoria
ORDER BY categoria;

-- ============================================================================
-- AHORA VINCULAR PREGUNTAS A TEMAS
-- ============================================================================

-- Vincular preguntas con códigos tipo "G03", "E4", etc.
UPDATE "Question" q
SET "temaId" = (
  SELECT t.id
  FROM "TemaOficial" t
  WHERE t.categoria = CASE 
    WHEN UPPER(SUBSTRING(q."temaCodigo", 1, 1)) = 'G' THEN 'general'
    WHEN UPPER(SUBSTRING(q."temaCodigo", 1, 1)) = 'E' THEN 'especifico'
  END
  AND t.numero = CAST(REGEXP_REPLACE(SUBSTRING(q."temaCodigo", 2), '[^0-9]', '', 'g') AS INTEGER)
  LIMIT 1
)
WHERE q."temaId" IS NULL
  AND q."temaCodigo" IS NOT NULL
  AND q."temaCodigo" ~ '^[GEge][0-9]+$';

-- VERIFICACIÓN FINAL
DO $$
DECLARE
  total INTEGER;
  con_tema INTEGER;
  sin_tema INTEGER;
  sin_codigo INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM "Question";
  SELECT COUNT(*) INTO con_tema FROM "Question" WHERE "temaId" IS NOT NULL;
  SELECT COUNT(*) INTO sin_tema FROM "Question" WHERE "temaId" IS NULL AND "temaCodigo" IS NOT NULL;
  SELECT COUNT(*) INTO sin_codigo FROM "Question" WHERE "temaCodigo" IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RESULTADO VINCULACIÓN TEMAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total preguntas: %', total;
  RAISE NOTICE '✅ Con temaId asignado: %', con_tema;
  RAISE NOTICE '⚠️  Sin temaId (tienen código): %', sin_tema;
  RAISE NOTICE '❌ Sin temaCodigo: %', sin_codigo;
  RAISE NOTICE '========================================';
  
  IF con_tema > 4500 THEN
    RAISE NOTICE '✅ VINCULACIÓN EXITOSA';
  ELSE
    RAISE WARNING '⚠️  Revisar preguntas no vinculadas';
  END IF;
END $$;

-- ============================================================================
-- ✅ COMPLETADO
-- ============================================================================
