-- SQL SEGURO: Crear tablas faltantes SIN afectar datos existentes
-- Ejecutar en Supabase para habilitar Auditoría, Backups y Analytics avanzado
-- SAFE: Usa IF NOT EXISTS para no sobrescribir nada

-- 1. Tabla de Auditoría (para logs de admin)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "adminId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "changes" TEXT,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- 2. Tabla de intentos de login fallidos
CREATE TABLE IF NOT EXISTS "FailedLoginAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para FailedLoginAttempt
CREATE INDEX IF NOT EXISTS "FailedLoginAttempt_email_createdAt_idx" ON "FailedLoginAttempt"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "FailedLoginAttempt_ipAddress_createdAt_idx" ON "FailedLoginAttempt"("ipAddress", "createdAt");

-- 3. Tabla de logs de backup
CREATE TABLE IF NOT EXISTS "BackupLog" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "fileName" TEXT,
  "fileSize" INTEGER,
  "recordCount" INTEGER,
  "duration" INTEGER,
  "error" TEXT,
  "triggeredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para BackupLog
CREATE INDEX IF NOT EXISTS "BackupLog_type_createdAt_idx" ON "BackupLog"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "BackupLog_status_createdAt_idx" ON "BackupLog"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");

-- Verificar creación
SELECT 
  'AuditLog' as tabla,
  COUNT(*) as registros
FROM "AuditLog"
UNION ALL
SELECT 
  'FailedLoginAttempt' as tabla,
  COUNT(*) as registros
FROM "FailedLoginAttempt"
UNION ALL
SELECT 
  'BackupLog' as tabla,
  COUNT(*) as registros
FROM "BackupLog";

-- Resultado esperado: 3 tablas con 0 registros cada una
