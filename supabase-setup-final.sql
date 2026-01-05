-- 1. Renombrar tabla AllowedPhone a AllowedPhoneNumber
ALTER TABLE IF EXISTS "AllowedPhone" RENAME TO "AllowedPhoneNumber";

-- 2. Renombrar columna createdAt a addedAt (para coincidir con schema Prisma)
ALTER TABLE IF EXISTS "AllowedPhoneNumber" RENAME COLUMN "createdAt" TO "addedAt";

-- 3. Eliminar columnas que no están en el schema
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "active";
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "name";
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "notes";

-- 4. Agregar columna groupName si no existe
ALTER TABLE "AllowedPhoneNumber" ADD COLUMN IF NOT EXISTS "groupName" TEXT;

-- 5. Actualizar índice
DROP INDEX IF EXISTS "AllowedPhone_phoneNumber_idx";
CREATE INDEX IF NOT EXISTS "AllowedPhoneNumber_phoneNumber_idx" ON "AllowedPhoneNumber"("phoneNumber");

-- 6. Insertar número de teléfono del admin: +34656809596
INSERT INTO "AllowedPhoneNumber" ("id", "phoneNumber", "groupName", "addedAt")
VALUES 
  (gen_random_uuid()::text, '+34656809596', 'Admin Principal', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '656809596', 'Admin Principal', CURRENT_TIMESTAMP)
ON CONFLICT ("phoneNumber") DO NOTHING;
