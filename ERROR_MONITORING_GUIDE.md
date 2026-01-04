# 🔍 Sistema de Monitoreo y Notificación de Errores

## Descripción General

El sistema de monitoreo automático de errores de **opositAPPSS** captura, registra y notifica al administrador sobre fallos en tiempo real cuando la aplicación está en producción.

### Características

✅ **Captura Automática de Errores**
- Captura errores no manejados en el frontend
- Registra errores críticos del backend
- Monitoreo de promesas rechazadas

✅ **Notificación Inmediata**
- Alertas por email al administrador
- Diferenciación de severidad (baja, media, alta, crítica)
- Contexto detallado en cada notificación

✅ **Dashboard de Administración**
- Panel visual de errores históricos
- Estadísticas de los últimos 7 días
- Filtros por tipo y severidad
- Marcar errores como resueltos

✅ **Base de Datos**
- Almacenamiento persistente de errores
- Información de usuario afectado
- Timestamps y resolución

---

## Configuración

### Variables de Entorno

Agrega estas variables a tu `.env` o `.env.local`:

```bash
# Email del administrador que recibirá alertas (separadas por comas si hay múltiples)
ADMIN_ERROR_EMAILS=alguero2@yahoo.com,otro-admin@example.com

# El resto de configuración de email ya existe
EMAIL_USER=luisalguero74@gmail.com
EMAIL_PASS=tu-contraseña-app
```

### Base de Datos

El modelo `SystemError` se agregó automáticamente a Prisma. Para aplicar la migración:

```bash
# Ya se ejecutó: npx prisma db push
# O para crear una migración formal:
# npx prisma migrate dev --name add_system_error_model
```

---

## Uso

### 1. Reportar Errores desde el Backend

```typescript
import { logError } from '@/lib/error-logger'

// En cualquier ruta o servicio del backend
try {
  // tu código
} catch (error) {
  await logError({
    errorType: 'API_ERROR',
    severity: 'high',
    endpoint: 'POST /api/questions/generate',
    statusCode: 500,
    message: 'Failed to generate questions from Groq API',
    stack: error instanceof Error ? error.stack : undefined,
    userEmail: session?.user?.email,
    context: { questionCount: 10, theme: 'LGSS' },
    notifyAdmin: true // Enviar email inmediatamente
  })
}
```

### 2. Reportar Errores desde el Frontend

```typescript
'use client'

import { useErrorReporter } from '@/hooks/useErrorReporter'

export default function MyComponent() {
  const reportError = useErrorReporter()

  const handleClick = async () => {
    try {
      // tu código
    } catch (error) {
      // Reportar y mostrar al usuario
      await reportError(
        'API_ERROR',
        'Failed to fetch data',
        'high',
        { endpoint: '/api/data', userId: '123' }
      )
    }
  }

  return <button onClick={handleClick}>Hacer algo</button>
}
```

### 3. Captura Automática Global

En tu layout o componente raíz:

```typescript
'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandler } from '@/hooks/useErrorReporter'

export default function RootLayout() {
  useEffect(() => {
    setupGlobalErrorHandler()
  }, [])

  return (
    <html>
      <body>{/* contenido */}</body>
    </html>
  )
}
```

---

## Niveles de Severidad

| Nivel | Emoji | Descrición | Notificación |
|-------|-------|-----------|--------------|
| **low** | 🔵 | Errores menores, no afectan funcionalidad | No (opcional) |
| **medium** | 🟡 | Errores que podrían afectar | No automática |
| **high** | 🟠 | Errores que sí afectan funcionalidad | ✅ Sí |
| **critical** | 🔴 | Errores que derrumban características | ✅ Sí inmediato |

---

## Dashboard de Administración

### Acceso

```
URL: http://localhost:3000/admin/error-monitoring
```

Requiere ser administrador de la plataforma.

### Funcionalidades

**Estadísticas en Tiempo Real:**
- Total de errores (últimos 7 días)
- Errores sin resolver
- Desglose por severidad
- Distribución por tipo

**Filtros:**
- Por estado (resueltos/sin resolver)
- Por severidad (crítica, alta, media, baja)
- Búsqueda por tipo de error

**Acciones:**
- Ver detalles completos del error
- Marcar como resuelto
- Ver información del usuario afectado
- Stack trace completo

---

## Tipos de Errores Comunes

```typescript
export type ErrorType = 
  | 'API_ERROR'              // Fallos en endpoints
  | 'DATABASE_ERROR'         // Errores de Prisma/BD
  | 'VALIDATION_ERROR'       // Validación de datos
  | 'AUTH_ERROR'             // Autenticación fallida
  | 'EXTERNAL_SERVICE_ERROR' // Groq, Stripe, etc.
  | 'UNKNOWN_ERROR'          // Otros errores
```

---

## Ejemplos de Implementación

### Ejemplo 1: Error en Generación de Preguntas

```typescript
// app/api/admin/generate-bulk-questions/route.ts
try {
  const response = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
  })
} catch (error) {
  await logError({
    errorType: 'EXTERNAL_SERVICE_ERROR',
    severity: 'high',
    endpoint: 'POST /api/admin/generate-bulk-questions',
    message: `Groq API Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    stack: error instanceof Error ? error.stack : undefined,
    context: { 
      service: 'Groq',
      model: 'llama-3.3-70b-versatile',
      inputLength: prompt.length
    },
    notifyAdmin: true
  })
  
  throw error
}
```

### Ejemplo 2: Error en Operación de BD

```typescript
// app/api/admin/practical-cases/route.ts
try {
  const practicalCase = await prisma.practicalCase.create({
    data: { /* datos */ }
  })
} catch (error) {
  await logError({
    errorType: 'DATABASE_ERROR',
    severity: 'critical',
    endpoint: 'POST /api/admin/practical-cases',
    message: `Database Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    userEmail: session?.user?.email,
    context: { operation: 'create', table: 'PracticalCase' },
    notifyAdmin: true
  })
}
```

### Ejemplo 3: Error de Validación en Frontend

```typescript
const reportError = useErrorReporter()

const handleSubmit = async (data) => {
  if (!data.email) {
    await reportError(
      'VALIDATION_ERROR',
      'Email is required',
      'low',
      { field: 'email', form: 'RegisterForm' }
    )
    return
  }
}
```

---

## Notificaciones por Email

### Estructura del Email

El email incluye:
- 🔴 Icono de severidad
- **Tipo de Error**: API_ERROR, DATABASE_ERROR, etc.
- **Mensaje**: Descripción clara del problema
- **Endpoint**: Ruta afectada
- **Status Code**: Código HTTP (si aplica)
- **Usuario Afectado**: Email del usuario (si aplica)
- **Stack Trace**: Información completa para debugging
- **Timestamp**: Cuándo ocurrió
- **ID de Error**: Para referencia rápida
- **Link al Dashboard**: Para revisar más detalles

### Destinatarios

Edita `ADMIN_ERROR_EMAILS` en `.env`:

```bash
# Un admin
ADMIN_ERROR_EMAILS=alguero2@yahoo.com

# Múltiples admins
ADMIN_ERROR_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com
```

---

## Mejores Prácticas

### ✅ Haz
- ✅ Loguear errores críticos con severidad `critical`
- ✅ Incluir contexto útil para debugging
- ✅ Diferenciar entre tipos de error
- ✅ Notificar inmediatamente para errores críticos
- ✅ Revisar regularmente el dashboard

### ❌ No Hagas
- ❌ Loguear cada warning como error
- ❌ Reportar errores esperados (ej: usuario no encontrado en login)
- ❌ Enviar información sensible en contexto
- ❌ Ignorar notificaciones por email

---

## Troubleshooting

### "No recibo emails de error"

1. Verifica `ADMIN_ERROR_EMAILS` en `.env`
2. Verifica que EMAIL_USER y EMAIL_PASS sean correctos
3. Revisa el panel de errores para ver si se registran igual
4. Comprueba logs del servidor: `console.error`

### "Los errores no aparecen en el dashboard"

1. Verifica conexión a BD: `npx prisma studio`
2. Verifica que el endpoint `POST /api/admin/log-error` responda
3. Comprueba en DevTools (F12 → Network) si se envía la petición
4. Revisa logs del servidor Next.js

### "¿Cómo deshabilitar notificaciones por email?"

En la llamada a `logError()`, usa:
```typescript
notifyAdmin: false // No enviar email
```

---

## Próximas Mejoras

- [ ] Webhooks para integración con Slack
- [ ] Gráficos de tendencias de errores
- [ ] Alertas automáticas por umbral (ej: más de 10 errores/hora)
- [ ] Exportar reportes de errores
- [ ] Correlacionar errores con releases/deploys
- [ ] Analytics de errores por usuario
- [ ] Alertas SMS para errores críticos

---

## API Reference

### `logError(options: ErrorLogOptions): Promise<string>`

Registra un error en la BD y notifica al admin.

**Parámetros:**
- `errorType`: Tipo de error
- `severity`: Nivel de severidad
- `message`: Descripción del error
- `endpoint?`: Ruta afectada
- `statusCode?`: Código HTTP
- `stack?`: Stack trace
- `userEmail?`: Email del usuario afectado
- `userId?`: ID del usuario
- `context?`: Contexto adicional (JSON)
- `notifyAdmin?`: Enviar email (default: basado en severidad)

**Retorna:** ID del error registrado

---

## Contacto y Soporte

Para preguntas sobre el sistema de monitoreo:
- 📧 Email: alguero2@yahoo.com
- 📊 Dashboard: `/admin/error-monitoring`
- 📝 Documentación: Este archivo

