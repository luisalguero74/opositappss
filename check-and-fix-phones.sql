-- Ver estado actual de la tabla
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%Phone%';

-- Ver datos actuales
SELECT * FROM "AllowedPhoneNumber";

-- Insertar números necesarios (si no existen)
INSERT INTO "AllowedPhoneNumber" ("id", "phoneNumber", "groupName", "addedAt") 
VALUES 
  (gen_random_uuid()::text, '+34656809596', 'Admin', NOW()),
  (gen_random_uuid()::text, '656809596', 'Admin', NOW()),
  (gen_random_uuid()::text, '+34666666666', 'Test', NOW()),
  (gen_random_uuid()::text, '666666666', 'Test', NOW())
ON CONFLICT ("phoneNumber") DO NOTHING;

-- Verificar inserción
SELECT * FROM "AllowedPhoneNumber" ORDER BY "addedAt" DESC;
