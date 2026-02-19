-- Crear TemaOficial para LGSS si no existe
INSERT INTO "TemaOficial" (
  "id",
  "numero",
  "titulo",
  "descripcion",
  "categoria",
  "normativaBase",
  "createdAt",
  "updatedAt"
)
VALUES (
  'LGSS',
  0,
  'Ley General de la Seguridad Social (RDL 8/2015)',
  'Normativa completa de la Ley General de la Seguridad Social - Real Decreto Legislativo 8/2015',
  'ESPECIFICO',
  'Real Decreto Legislativo 8/2015, de 30 de octubre',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Verificar que se creó
SELECT * FROM "TemaOficial" WHERE "id" = 'LGSS';
