-- Renombrar tabla AllowedPhone a AllowedPhoneNumber para coincidir con schema Prisma
ALTER TABLE IF EXISTS "AllowedPhone" RENAME TO "AllowedPhoneNumber";

-- Eliminar columnas que no están en el schema
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "active";
ALTER TABLE IF EXISTS "AllowedPhoneNumber" DROP COLUMN IF EXISTS "updatedAt";

-- Actualizar índice
DROP INDEX IF EXISTS "AllowedPhone_phoneNumber_idx";
CREATE INDEX IF NOT EXISTS "AllowedPhoneNumber_phoneNumber_idx" ON "AllowedPhoneNumber"("phoneNumber");

