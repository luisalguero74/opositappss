-- Crear usuario admin
INSERT INTO "User" ("email", "phoneNumber", "password", "role", "active", "createdAt", "updatedAt")
VALUES (
  'alguero2@yahoo.com',
  '+34656809596',
  '$2b$10$RDPqxxSEvfGbcuKDRFkUy.O.IUtu/ivZBH5EE9RLSBRfMVWU9HqVi',
  'ADMIN',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Verificar que se creó
SELECT "id", "email", "phoneNumber", "role" FROM "User" WHERE "email" = 'alguero2@yahoo.com';
