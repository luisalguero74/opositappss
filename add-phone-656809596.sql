-- Agregar número de teléfono permitido
INSERT INTO "AllowedPhoneNumber" ("id", "phoneNumber", "groupName", "addedAt") 
VALUES 
  (gen_random_uuid()::text, '+34656809596', 'Admin', NOW()),
  (gen_random_uuid()::text, '656809596', 'Admin', NOW())
ON CONFLICT ("phoneNumber") DO NOTHING;
