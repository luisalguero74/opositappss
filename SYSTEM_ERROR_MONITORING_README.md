# 📊 Sistema de Monitoreo de Errores - Guía Rápida

## ¿Qué se instaló?

Se agregó un **sistema de notificación automática de errores** que captura y registra fallos en la aplicación, notificando al administrador por email cuando hay problemas críticos.

---

## Componentes Principales

### 1. **Base de Datos** 
- Modelo `SystemError` en Prisma
- Almacena: tipo, severidad, mensaje, stack trace, usuario afectado, etc.
- Ubicación: `prisma/schema.prisma` (ya migrado)

### 2. **Servicio de Logging**
- Archivo: `src/lib/error-logger.ts`
- Funciones principales:
  - `logError()` - Registra error y notifica al admin
  - `resolveError()` - Marca error como resuelto
  - `getUnresolvedErrors()` - Obtiene errores pendientes
  - `getErrorStats()` - Estadísticas de los últimos 7 días

### 3. **APIs**
- `POST /api/admin/log-error` - Registra un error (frontend o backend)
- `GET /api/admin/errors` - Obtiene lista de errores (requiere admin)
- `PATCH /api/admin/errors` - Marca error como resuelto

### 4. **Dashboard Admin**
- URL: `http://localhost:3000/admin/error-monitoring`
- Muestra:
  - Estadísticas en tiempo real
  - Lista de errores sin resolver
  - Filtros por severidad y tipo
  - Detalles completos de cada error

### 5. **Hook para Frontend**
- Archivo: `src/hooks/useErrorReporter.ts`
- Permite reportar errores desde componentes React
- Incluye captura automática de errores globales

### 6. **Integración en APIs**
- Ya integrado en: `app/api/admin/generate-bulk-questions/route.ts`
- Captura errores de Groq y registra en BD
- Notifica al admin si es severidad alta o crítica

---

## Cómo Usar

### Desde el Backend (TypeScript/Node.js)

```typescript
import { logError } from '@/lib/error-logger'

try {
  // Tu código
  await generarPreguntas()
} catch (error) {
  await logError({
    errorType: 'API_ERROR',
    severity: 'high',
    endpoint: 'POST /api/admin/questions',
    statusCode: 500,
    message: 'Failed to generate questions',
    stack: error instanceof Error ? error.stack : undefined,
    context: { questionType: 'LGSS' },
    notifyAdmin: true // Envía email
  })
}
```

### Desde el Frontend (React)

```typescript
'use client'

import { useErrorReporter } from '@/hooks/useErrorReporter'

export default function MyComponent() {
  const reportError = useErrorReporter()

  const handleClick = async () => {
    try {
      await fetch('/api/data')
    } catch (error) {
      await reportError(
        'API_ERROR',
        'Failed to fetch data',
        'high',
        { endpoint: '/api/data' }
      )
    }
  }

  return <button onClick={handleClick}>Click</button>
}
```

### Captura Automática Global

Agrega esto en tu layout raíz:

```typescript
'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandler } from '@/hooks/useErrorReporter'

export default function RootLayout({ children }) {
  useEffect(() => {
    setupGlobalErrorHandler() // Captura errores no manejados
  }, [])

  return <html><body>{children}</body></html>
}
```

---

## Configuración Necesaria

### Variables de Entorno (`.env` o `.env.local`)

```bash
# NUEVO - Email del administrador para alertas de errores
ADMIN_ERROR_EMAILS=alguero2@yahoo.com

# Múltiples admins (separados por comas)
# ADMIN_ERROR_EMAILS=admin1@example.com,admin2@example.com

# Estos ya deberían estar configurados:
EMAIL_USER=luisalguero74@gmail.com
EMAIL_PASS=tu-contraseña-app
```

---

## Niveles de Severidad

| Nivel | Emoji | Descripción | Email Admin |
|-------|-------|-------------|------------|
| `low` | 🔵 | Errores menores | No |
| `medium` | 🟡 | Errores moderados | No (a menos que especifiques) |
| `high` | 🟠 | Errores importantes | ✅ Sí |
| `critical` | 🔴 | Fallos críticos | ✅ Sí inmediato |

---

## Dashboard Admin

### Acceso
```
URL: http://localhost:3000/admin/error-monitoring
```

### Funcionalidades
- ✅ Ver todos los errores sin resolver
- ✅ Filtrar por severidad (crítico, alto, medio, bajo)
- ✅ Ver detalles completos: stack trace, usuario afectado, timestamp
- ✅ Marcar errores como resueltos
- ✅ Ver estadísticas de los últimos 7 días
- ✅ Gráfico de distribución de tipos de error

---

## Ejemplos de Integración

### Ejemplo 1: Manejo de Error en Groq
```typescript
try {
  const response = await groq.chat.completions.create({...})
} catch (error) {
  await logError({
    errorType: 'EXTERNAL_SERVICE_ERROR',
    severity: 'critical',
    endpoint: 'POST /api/questions/generate',
    message: `Groq API failed: ${error.message}`,
    context: { service: 'Groq', model: 'llama-3.3-70b' },
    notifyAdmin: true
  })
  throw error
}
```

### Ejemplo 2: Error en Prisma
```typescript
try {
  await prisma.question.create({ data: {...} })
} catch (error) {
  await logError({
    errorType: 'DATABASE_ERROR',
    severity: 'high',
    endpoint: 'POST /api/questions',
    message: `Database error: ${error.message}`,
    context: { operation: 'create', table: 'Question' },
    notifyAdmin: true
  })
}
```

### Ejemplo 3: Validación en Frontend
```typescript
const reportError = useErrorReporter()

if (!email.includes('@')) {
  await reportError(
    'VALIDATION_ERROR',
    'Invalid email format',
    'low' // No notificar, es esperado
  )
  return
}
```

---

## Flujo de Error

```
1. Error ocurre en la aplicación
   ↓
2. logError() captura el error
   ↓
3. Registra en BD (tabla SystemError)
   ↓
4. Si severidad >= high, envía email al admin
   ↓
5. Admin ve en dashboard y marca como resuelto
```

---

## Tipos de Error Soportados

```typescript
'API_ERROR'              // Fallos en endpoints REST
'DATABASE_ERROR'         // Errores de Prisma/SQL
'VALIDATION_ERROR'       // Datos inválidos
'AUTH_ERROR'             // Autenticación fallida
'EXTERNAL_SERVICE_ERROR' // Groq, Stripe, etc.
'UNKNOWN_ERROR'          // Otros
```

---

## Archivos Creados/Modificados

### ✅ Nuevos Archivos
- `src/lib/error-logger.ts` - Servicio de logging
- `src/hooks/useErrorReporter.ts` - Hook para reportar errores
- `app/api/admin/log-error/route.ts` - Endpoint para registrar errores
- `app/api/admin/errors/route.ts` - APIs GET/PATCH para gestionar errores
- `app/admin/error-monitoring/page.tsx` - Dashboard admin
- `ERROR_MONITORING_GUIDE.md` - Guía detallada de uso

### 📝 Archivos Modificados
- `prisma/schema.prisma` - Agregado modelo `SystemError`
- `app/api/admin/generate-bulk-questions/route.ts` - Integrado error logging

---

## Próximos Pasos (Opcionales)

1. **Agregar integración con Slack**
   - Enviar notificaciones a canal de Slack en lugar de email

2. **Webhooks**
   - Notificar a servicios externos (Sentry, DataDog, etc.)

3. **Alertas por Umbral**
   - Si hay más de X errores en Y minutos, alerta crítica

4. **Análisis de Tendencias**
   - Gráficos de errores por hora/día/semana

5. **Correlación con Releases**
   - Asociar errores con versión desplegada

---

## Testeo Rápido

### 1. Generar un error manualmente
```bash
# Desde el navegador, consola:
fetch('/api/admin/log-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errorType: 'TEST_ERROR',
    severity: 'high',
    message: 'This is a test error',
    endpoint: '/test'
  })
})
```

### 2. Ver en el dashboard
```
http://localhost:3000/admin/error-monitoring
```

### 3. Recibir email
- Revisa el email configurado en `ADMIN_ERROR_EMAILS`

---

## Soporte

Para preguntas o issues:
- 📧 Admin: alguero2@yahoo.com
- 📍 Dashboard: `/admin/error-monitoring`
- 📚 Docs: `ERROR_MONITORING_GUIDE.md`

