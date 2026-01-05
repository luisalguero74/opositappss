-- Probar inserción de usuario
INSERT INTO "User" ("id", "email", "phoneNumber", "password", "role", "active", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'test@example.com', '+34656809596', 'test_hash', 'user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ver el usuario creado
SELECT * FROM "User" WHERE email = 'test@example.com';
