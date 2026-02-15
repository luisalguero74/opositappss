# 📘 Guía de Migraciones Prisma - opositAPPSS

## 🎯 Problema Común y Solución

### ❌ Problema
Las migraciones de Prisma pueden fallar con errores como:
- `prepared statement "s1" already exists`
- `Database schema is not up to date`
- Timeouts de conexión
- IPv6 connectivity issues

### ✅ Solución
Usar los scripts automatizados que manejan:
- Conversión automática a session pooler (`:5432` en vez de `:6543`)
- Parámetros compatibles con PgBouncer
- Verificación antes y después de migrar

---

## 🚀 Uso Rápido

### Migración Segura (Recomendado)
```bash
node scripts/safe-migrate.mjs
```

### Ver Qué Haría Sin Ejecutar
```bash
node scripts/safe-migrate.mjs --dry-run
```

### Forzar Re-ejecución
```bash
node scripts/safe-migrate.mjs --force
```

---

## 🔧 Scripts Disponibles

### 1. `get-db-url-for-prisma-migrate.mjs`
**Propósito:** Obtiene la URL de DB con parámetros seguros para migraciones.

**Qué hace:**
- Lee variables de entorno (`.env.production.local`, `.env.local`, etc.)
- Convierte `:6543` → `:5432` (transaction → session pooler)
- Añade parámetros de compatibilidad:
  - `pgbouncer=true`
  - `statement_cache_size=0`
  - `connection_limit=1`

**Uso:**
```bash
node scripts/get-db-url-for-prisma-migrate.mjs
```

**Salida:**
```
postgresql://user:pass@host:5432/db?pgbouncer=true&statement_cache_size=0&connection_limit=1
```

---

### 2. `get-db-url-for-migrations.mjs`
**Propósito:** URL simplificada (solo convierte a session pooler).

**Uso:**
```bash
node scripts/get-db-url-for-migrations.mjs
```

---

### 3. `safe-migrate.mjs` ⭐ RECOMENDADO
**Propósito:** Script todo-en-uno para migrar de forma segura.

**Características:**
- ✅ Obtiene URL automáticamente
- ✅ Verifica estado actual
- ✅ Despliega migraciones
- ✅ Verifica resultado
- ✅ Logs claros con colores

**Opciones:**
- `--dry-run` / `-n`: Ver qué haría sin ejecutar
- `--force` / `-f`: Forzar incluso si está actualizado
- `--help` / `-h`: Mostrar ayuda

---

## 📋 Comandos Manuales

### Ver Estado de Migraciones
```bash
# Obtener URL
export DB_URL=$(node scripts/get-db-url-for-prisma-migrate.mjs)

# Ver estado
DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" npx prisma migrate status
```

### Ejecutar Migraciones Manualmente
```bash
# Obtener URL
export DB_URL=$(node scripts/get-db-url-for-prisma-migrate.mjs)

# Ejecutar migraciones
DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" npx prisma migrate deploy
```

### Crear Nueva Migración
```bash
npx prisma migrate dev --name nombre_descriptivo
```

---

## 🏗️ Arquitectura de Conexión

### Supabase Pooling
```
┌─────────────────────────────────────────┐
│  Supabase Database                      │
│                                         │
│  ┌──────────────┐                      │
│  │ Direct DB    │ ← No accesible      │
│  │ :5432 (IPv6) │   desde algunas     │
│  └──────────────┘   redes              │
│         ↓                               │
│  ┌──────────────────────────────┐      │
│  │ Session Pooler (PgBouncer)   │      │
│  │ :5432 (IPv4 + IPv6)         │ ← ✅  │
│  │ Modo: session               │      │
│  │ - Permite prepared stmts    │      │
│  │ - Compatible con migraciones│      │
│  └──────────────────────────────┘      │
│         ↓                               │
│  ┌──────────────────────────────┐      │
│  │ Transaction Pooler          │      │
│  │ :6543 (IPv4 + IPv6)        │ ← ❌  │
│  │ Modo: transaction           │      │
│  │ - NO prepared statements    │      │
│  │ - Causa errores en migraciones     │
│  └──────────────────────────────┘      │
└─────────────────────────────────────────┘
```

### Variables de Entorno
```bash
# Producción (Supabase)
POSTGRES_PRISMA_URL=postgres://...@aws-0-eu-west-1.pooler.supabase.com:6543/...
POSTGRES_URL_NON_POOLING=postgres://...@db.xxx.supabase.co:5432/...  # IPv6 only
DATABASE_URL=postgres://...@aws-0-eu-west-1.pooler.supabase.com:5432/...

# Para migraciones usar:
# - SESSION POOLER (:5432) con parámetros de compatibilidad
```

---

## 🐛 Solución de Problemas

### Error: "prepared statement already exists"
**Causa:** Usando transaction pooler (`:6543`) o falta `statement_cache_size=0`

**Solución:**
```bash
# Usar el script seguro
node scripts/safe-migrate.mjs
```

### Error: "Database schema is not up to date"
**Causa:** La tabla `_prisma_migrations` no existe o está desactualizada

**Solución:**
```bash
# Ver diferencias
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Aplicar migraciones
node scripts/safe-migrate.mjs
```

### Error: Connection timeout / IPv6
**Causa:** Host directo de Supabase solo responde en IPv6

**Solución:**
Los scripts automáticamente usan el session pooler que funciona en IPv4.

---

## ✅ Checklist Pre-Deployment

Antes de desplegar a producción:

1. ✅ Verificar que el schema local está correcto
```bash
npx prisma format
npx prisma validate
```

2. ✅ Generar cliente Prisma actualizado
```bash
npx prisma generate
```

3. ✅ Ver estado de migraciones
```bash
node scripts/safe-migrate.mjs --dry-run
```

4. ✅ Ejecutar migraciones
```bash
node scripts/safe-migrate.mjs
```

5. ✅ Verificar en producción
```bash
# Acceder a https://www.opositapp.site
# Probar funcionalidad crítica
```

---

## 📝 Historial de Soluciones

### 11 Feb 2026
- **Problema:** Migraciones fallaban con pooler transaccional
- **Solución:** Creados scripts para usar session pooler (:5432)
- **Resultado:** `_prisma_migrations` restaurada, baseline aplicado

### 10 Feb 2026
- **Problema:** Faltaban columnas en producción
- **Solución:** SQL manual + scripts de migración seguros
- **Resultado:** Schema sincronizado

---

## 🔗 Referencias

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PgBouncer + Prisma](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)
- [Supabase Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## 💡 Tips

1. **Siempre usa `safe-migrate.mjs`** en producción
2. **Nunca uses `prisma db push`** en producción (no crea registro de migraciones)
3. **Haz backup antes de migrar** usando `/admin/backups`
4. **Verifica en local primero** con `npx prisma migrate dev`
5. **Los errores de "prepared statement" significan pooler incorrecto**

---

## 🆘 Ayuda

Si tienes problemas:

1. Verifica las variables de entorno:
```bash
cat .env.production.local | grep -E "DATABASE_URL|POSTGRES"
```

2. Prueba la conexión:
```bash
DB_URL=$(node scripts/get-db-url-for-prisma-migrate.mjs)
echo $DB_URL | sed 's/:.*@/:****@/g'  # Ver URL sin contraseña
```

3. Verifica el estado:
```bash
node scripts/safe-migrate.mjs --dry-run
```

4. Consulta los logs de Supabase Dashboard

---

**Última actualización:** 14 Feb 2026
**Mantenedor:** Admin opositAPPSS
