# ✅ Sistema de Monitoreo de Errores - Implementado

## Resumen de lo que se agregó

Se implementó un **sistema completo de notificación y monitoreo de errores en tiempo real** para alertar al administrador cuando hay fallos en la aplicación desplegada.

---

## 🎯 Características Principales

### ✅ Captura Automática de Errores
- Errores no manejados del frontend
- Errores críticos del backend  
- Promesas rechazadas sin capturar
- Errores de servicios externos (Groq, Stripe, etc.)

### ✅ Notificación Inmediata al Admin
- Email automático para errores de severidad alta/crítica
- Información detallada: tipo, severidad, endpoint, usuario afectado
- Stack trace completo para debugging
- Link directo al dashboard

### ✅ Registro Persistente en BD
- Tabla `SystemError` con:
  - Tipo de error
  - Severidad (low, medium, high, critical)
  - Endpoint y status code
  - Email del usuario afectado
  - Stack trace
  - Contexto adicional
  - Timestamps
  - Estado de resolución

### ✅ Dashboard Admin Interactivo
- URL: `/admin/error-monitoring`
- Estadísticas en tiempo real (últimos 7 días)
- Filtros por severidad y tipo
- Marcar errores como resueltos
- Ver detalles completos de cada error
- Gráficos de distribución

### ✅ Integración en APIs Existentes
- Ya integrado en endpoint de generación de preguntas
- Captura errores de Groq automáticamente
- Manejo robusto de excepciones

---

## 📁 Archivos Creados

```
src/lib/
  └── error-logger.ts                    # Servicio central de logging

src/hooks/
  └── useErrorReporter.ts                # Hook para componentes React

app/api/admin/
  ├── log-error/route.ts                 # Endpoint POST para registrar errores
  └── errors/route.ts                    # APIs GET/PATCH para gestionar errores

app/admin/
  └── error-monitoring/page.tsx          # Dashboard visual

docs/
  ├── ERROR_MONITORING_GUIDE.md          # Guía detallada completa
  └── SYSTEM_ERROR_MONITORING_README.md  # Guía rápida

prisma/
  └── schema.prisma                      # Actualizado con modelo SystemError
```

---

## 🚀 Cómo Usar

### Opción 1: Backend (Servidor)
```typescript
import { logError } from '@/lib/error-logger'

try {
  // Tu código
} catch (error) {
  await logError({
    errorType: 'API_ERROR',
    severity: 'high',
    endpoint: 'POST /api/questions',
    message: 'Failed to generate questions',
    stack: error instanceof Error ? error.stack : undefined,
    notifyAdmin: true
  })
}
```

### Opción 2: Frontend (Navegador)
```typescript
'use client'

import { useErrorReporter } from '@/hooks/useErrorReporter'

export default function Component() {
  const reportError = useErrorReporter()

  const handleClick = async () => {
    try {
      // Tu código
    } catch (error) {
      await reportError(
        'API_ERROR',
        'Something went wrong',
        'high'
      )
    }
  }

  return <button onClick={handleClick}>Click</button>
}
```

### Opción 3: Captura Automática Global
Agrega esto en tu layout raíz:
```typescript
useEffect(() => {
  setupGlobalErrorHandler()
}, [])
```

---

## ⚙️ Configuración

### Variables de Entorno (`.env`)
```bash
# Email(s) que recibirán alertas de errores
ADMIN_ERROR_EMAILS=alguero2@yahoo.com

# Múltiples admins (separados por comas)
# ADMIN_ERROR_EMAILS=admin1@example.com,admin2@example.com

# El resto de emails (ya configurado)
EMAIL_USER=luisalguero74@gmail.com
EMAIL_PASS=tu-app-password
```

---

## 📊 Dashboard Admin

### Acceso
```
http://localhost:3000/admin/error-monitoring
```

### Lo que verás
- 📈 Estadísticas: Total, Sin resolver, Críticos, Altos
- 📋 Lista de errores con filtros
- 🔴 Indicadores visuales de severidad
- 🔎 Detalles completos de cada error
- ✓ Botón para marcar como resuelto
- 📊 Gráfico de tipos de error

---

## 🔴 Niveles de Severidad

| Nivel | Icono | Descripción | Email |
|-------|-------|-------------|-------|
| low | 🔵 | Errores menores | No |
| medium | 🟡 | Errores moderados | No |
| high | 🟠 | Errores importantes | ✅ Sí |
| critical | 🔴 | Fallos críticos | ✅ Sí |

---

## 📧 Notificaciones por Email

### Cuándo se envían
- Severidad `high` → Email automático
- Severidad `critical` → Email inmediato
- Severidad `low`/`medium` → Solo en dashboard (a menos que especifiques)

### Qué incluye el email
```
🔴 [CRITICAL] Error en opositAPPSS
─────────────────────────────────
Tipo de Error: API_ERROR
Mensaje: Failed to generate questions from Groq API
Endpoint: POST /api/admin/generate-bulk-questions
Status Code: 500
Usuario Afectado: usuario@example.com
Timestamp: 4/1/2026, 14:32:45
ID de Error: cluwq1234...

Stack Trace:
[Información completa para debugging]

Contexto:
[Datos adicionales relevantes]

─────────────────────────────────
Revisa: http://localhost:3000/admin/error-monitoring
```

---

## 🧪 Prueba Rápida

### 1. Genera un error de prueba
```javascript
// En la consola del navegador (F12)
fetch('/api/admin/log-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errorType: 'TEST_ERROR',
    severity: 'high',
    message: 'Test error message',
    endpoint: '/test'
  })
})
```

### 2. Ve al dashboard
```
http://localhost:3000/admin/error-monitoring
```

### 3. Revisa tu email
- La dirección configurada en `ADMIN_ERROR_EMAILS`

---

## 🔧 Integración Actual

Ya se integró en:
- `app/api/admin/generate-bulk-questions/route.ts`
  - Captura errores de Groq
  - Notifica si es severidad alta/crítica
  - Registra contexto del error

---

## 📚 Documentación Completa

Para más detalles, lee:
- `ERROR_MONITORING_GUIDE.md` - Guía exhaustiva
- `SYSTEM_ERROR_MONITORING_README.md` - Guía rápida de referencia

---

## ✨ Mejoras Futuras (Opcionales)

- [ ] Integración con Slack
- [ ] Webhooks para servicios externos
- [ ] Alertas por umbral (X errores en Y minutos)
- [ ] Análisis de tendencias
- [ ] Correlación con releases
- [ ] Alertas SMS para críticos
- [ ] Exportar reportes
- [ ] Analytics por usuario

---

## 🎯 Estado Final

✅ **Sistema completamente funcional y listo para producción**

- Base de datos: Migrada
- APIs: Implementadas
- Dashboard: Operativo
- Notificaciones: Configuradas
- Integración: En marcha
- Documentación: Completa

---

## 📝 Notas Importantes

1. **Seguridad**: El endpoint de log-error está accesible sin autenticación (para capturar errores críticos), pero el dashboard requiere admin.

2. **Performance**: El logging es no-bloqueante, no afecta el flujo principal de la aplicación.

3. **Almacenamiento**: Los errores se guardan indefinidamente. Puedes implementar limpieza automática después de 30/60 días si lo necesitas.

4. **Email**: Las notificaciones usan Nodemailer con Gmail. Asegúrate que las credenciales sean correctas.

5. **Privacidad**: El stack trace puede contener información sensible. En producción, considera limitar lo que se guarda.

---

## 🆘 Troubleshooting

### No recibo emails
1. Verifica `ADMIN_ERROR_EMAILS` en `.env`
2. Verifica `EMAIL_USER` y `EMAIL_PASS`
3. Revisa si el error se registró en BD
4. Comprueba logs del servidor

### El dashboard muestra vacío
1. Verifica que hayas iniciado el dev server
2. Intenta generar un error de prueba
3. Comprueba permisos de admin en BD

### Error en migración de BD
```bash
# Si hay problemas con Prisma:
npx prisma db push --force-reset

# O:
npx prisma migrate resolve --rolled-back
npx prisma migrate dev
```

---

## 🎉 ¡Listo para Producción!

El sistema está completamente operativo. Cuando despliegues la aplicación:

1. ✅ Los errores se capturarán automáticamente
2. ✅ El admin recibirá emails de errores críticos
3. ✅ Podrá verlos y gestionarlos en el dashboard
4. ✅ Tendrá información completa para debugging

