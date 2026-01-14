-- Script para resetear contraseña de administrador
-- Usuario: alguero2@yahoo.com
-- Nueva contraseña temporal: Admin2026!

-- Hash bcrypt de "Admin2026!" con salt rounds = 10
-- Puedes cambiarla después desde el panel de admin

UPDATE "User"
SET 
  "password" = '$2b$10$CZWWfGjHQJ7QRMYLk0.VQ.gSrsReh5RiL/bVSk67H5OBBozyjFX.q',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'alguero2@yahoo.com' AND "role" = 'ADMIN';

-- Verificar que se actualizó
SELECT 
  "id", 
  "email", 
  "role", 
  "active",
  "updatedAt"
FROM "User" 
WHERE "email" = 'alguero2@yahoo.com';
