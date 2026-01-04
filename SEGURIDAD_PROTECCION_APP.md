# 🛡️ Sistema de Protección y Seguridad - OpositApp

## 📋 Índice

1. [Introducción](#introducción)
2. [Componentes del Sistema](#componentes-del-sistema)
3. [Middleware de Seguridad](#middleware-de-seguridad)
4. [Utilidades de Seguridad](#utilidades-de-seguridad)
5. [Sistema de Logging](#sistema-de-logging)
6. [Configuración](#configuración)
7. [Monitoreo y Alertas](#monitoreo-y-alertas)
8. [Mejores Prácticas](#mejores-prácticas)

## 🎯 Introducción

OpositApp cuenta con un sistema completo de seguridad que protege contra las amenazas más comunes en aplicaciones web, incluyendo:

- ✅ **Rate Limiting** - Previene ataques de fuerza bruta
- ✅ **Autenticación y Autorización** - Control de acceso basado en roles
- ✅ **Security Headers** - Protección contra ataques comunes
- ✅ **Content Security Policy** - Previene XSS
- ✅ **Input Sanitization** - Previene inyecciones
- ✅ **Logging de Seguridad** - Auditoría completa
- ✅ **CSRF Protection** - Previene ataques de falsificación

## 🔧 Componentes del Sistema

### 1. Middleware de Seguridad (`middleware.ts`)

Archivo principal que intercepta todas las peticiones y aplica:

#### Security Headers

```typescript
{
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

#### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' https://api.groq.com https://api.stripe.com;
```

#### Rate Limiting

**Límites por endpoint:**

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/api/auth/*` | 10 req | 1 minuto |
| `/api/admin/*` | 100 req | 1 minuto |
| `/api/*` (otros) | 50 req | 1 minuto |

**Respuesta al exceder límite:**

```json
{
  "error": "Too many requests",
  "message": "Por favor, espera un momento antes de intentar de nuevo"
}
```

Status: `429 Too Many Requests`  
Header: `Retry-After: 60`

#### Protección de Rutas

**Rutas Públicas** (no requieren autenticación):
- `/`
- `/login`
- `/register`
- `/pricing`
- `/api/auth/*`

**Rutas Protegidas** (requieren autenticación):
- `/dashboard`
- `/quiz/*`
- `/practical-cases/*`
- `/statistics`
- `/asistente-estudio`
- `/forum`
- `/classroom`

**Rutas de Administrador** (requieren rol `admin`):
- `/admin/*`

**Flujo de redirección:**
```
Usuario no autenticado → Ruta protegida → Redirige a /login?callbackUrl=ruta-original
Usuario autenticado no-admin → /admin → Redirige a /dashboard
```

### 2. Utilidades de Seguridad (`src/lib/security.ts`)

#### Sanitización de Inputs

```typescript
// Sanitizar string individual
const safe = sanitizeString(userInput)

// Sanitizar objeto completo
const safeData = sanitizeObject({
  title: '<script>alert("xss")</script>',
  description: 'Normal text'
})
// Resultado: { title: '&lt;script&gt;alert("xss")&lt;/script&gt;', description: 'Normal text' }

// Sanitizar datos de formulario
const sanitized = sanitizeFormData(req.body)
```

#### Validaciones

```typescript
// Email
isValidEmail('user@example.com') // true

// Teléfono español
isValidSpanishPhone('+34611222333') // true
isValidSpanishPhone('+34555123456') // false (555 no es válido)

// Contraseña segura
const validation = isValidPassword('MyPass123!')
// { valid: true, errors: [] }

// UUID
isValidUUID('123e4567-e89b-12d3-a456-426614174000') // true

// Código de tema
isValidTemaCodigo('G1') // true
isValidTemaCodigo('E15') // true
```

#### Encriptación

```typescript
const encrypted = encrypt('dato sensible', process.env.ENCRYPTION_KEY!)
const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY!)
```

#### Prevención de Inyecciones

```typescript
// SQL injection
const safe = escapeSql("'; DROP TABLE users; --")

// Prototype pollution
if (isSafeKey(key)) {
  obj[key] = value
}

// Merge seguro
const merged = safeMerge(target, untrustedSource)
```

#### Tokens Seguros

```typescript
// CSRF token
const token = generateCsrfToken()
const isValid = verifyCsrfToken(receivedToken, storedToken)

// Token aleatorio
const resetToken = generateSecureToken(32)
```

### 3. Sistema de Logging (`src/lib/security-logger.ts`)

#### Tipos de Eventos

```typescript
enum SecurityEventType {
  // Autenticación
  LOGIN_SUCCESS,
  LOGIN_FAILED,
  LOGOUT,
  PASSWORD_CHANGED,
  
  // Autorización
  UNAUTHORIZED_ACCESS,
  ADMIN_ACCESS,
  ROLE_CHANGED,
  
  // Ataques
  RATE_LIMIT_EXCEEDED,
  SQL_INJECTION_ATTEMPT,
  XSS_ATTEMPT,
  CSRF_VIOLATION,
  
  // Datos sensibles
  DATA_EXPORT,
  DATA_DELETION,
  
  // Sistema
  API_ERROR,
  DATABASE_ERROR
}
```

#### Niveles de Severidad

- **low**: Eventos normales (login exitoso, logout)
- **medium**: Eventos importantes (cambio password, acceso admin)
- **high**: Eventos sospechosos (acceso no autorizado, XSS)
- **critical**: Amenazas graves (SQL injection, múltiples fallos login)

#### Uso del Logger

```typescript
import { securityLogger } from '@/lib/security-logger'

// Login exitoso
securityLogger.logLoginSuccess(userId, email, ip)

// Login fallido
securityLogger.logLoginFailed(email, ip, 'Invalid password')

// Acceso no autorizado
securityLogger.logUnauthorizedAccess('/admin', userId, ip)

// Acceso de administrador
securityLogger.logAdminAccess(adminId, '/admin/users', 'delete_user', ip)

// Rate limit excedido
securityLogger.logRateLimitExceeded(ip, '/api/auth/login')

// Intento de SQL injection
securityLogger.logSqlInjectionAttempt(ip, '/api/users', payload)

// Exportación de datos
securityLogger.logDataExport(adminId, 'users', 1500)

// Cambio de rol
securityLogger.logRoleChanged(adminId, targetUserId, 'user', 'admin')
```

#### Ubicación de Logs

```
logs/security/
├── security-2026-01-02.log
├── security-2026-01-03.log
└── security-2026-01-04.log
```

**Formato de log:**

```json
{
  "timestamp": "2026-01-02T10:30:00.000Z",
  "type": "LOGIN_FAILED",
  "userEmail": "test@example.com",
  "ip": "192.168.1.100",
  "details": { "reason": "Invalid password" },
  "severity": "medium"
}
```

#### Leer y Analizar Logs

```typescript
// Leer logs de hoy
const events = securityLogger.readLogs()

// Leer logs de fecha específica
const events = securityLogger.readLogs('2026-01-02')

// Obtener estadísticas
const stats = securityLogger.getStats()
/*
{
  total: 1523,
  byType: {
    LOGIN_SUCCESS: 850,
    LOGIN_FAILED: 45,
    ADMIN_ACCESS: 120,
    ...
  },
  bySeverity: {
    low: 900,
    medium: 500,
    high: 100,
    critical: 23
  },
  criticalEvents: [...]
}
*/
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Autenticación
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Encriptación
ENCRYPTION_KEY=your-encryption-key-32-chars

# Base de datos
DATABASE_URL=postgresql://...

# APIs externas
GROQ_API_KEY=...
STRIPE_SECRET_KEY=...
```

### Configurar Rate Limits

Edita `middleware.ts`:

```typescript
const RATE_LIMITS = {
  '/api/auth/': { requests: 10, window: 60000 }, // 10/min
  '/api/admin/': { requests: 100, window: 60000 }, // 100/min
  '/api/': { requests: 50, window: 60000 }, // 50/min
}
```

### Añadir Rutas Protegidas

```typescript
const protectedRoutes = [
  '/dashboard',
  '/quiz',
  '/nueva-ruta-protegida', // Añadir aquí
]
```

### Personalizar CSP

```typescript
const CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' https://tu-cdn.com;
  // ... más directivas
`
```

## 📊 Monitoreo y Alertas

### Panel de Seguridad (Admin)

**Ruta**: `/admin/security` (Próximamente)

**Métricas:**
- Eventos de seguridad últimas 24h
- Intentos de acceso no autorizado
- IPs bloqueadas por rate limit
- Eventos críticos sin resolver
- Gráficas de tendencias

### Alertas Automáticas

Los eventos **critical** se registran automáticamente en consola:

```
🚨 CRITICAL SECURITY EVENT: {
  type: 'SQL_INJECTION_ATTEMPT',
  ip: '203.0.113.45',
  path: '/api/users',
  ...
}
```

### Integración con Servicios Externos

```typescript
// Ejemplo: Enviar a Sentry
if (event.severity === 'critical') {
  Sentry.captureException(new Error(event.type), {
    extra: event
  })
}

// Ejemplo: Enviar email a admins
if (event.type === 'SQL_INJECTION_ATTEMPT') {
  sendEmailToAdmins({
    subject: '🚨 Intento de SQL Injection Detectado',
    body: JSON.stringify(event, null, 2)
  })
}
```

## 🛡️ Protecciones Específicas

### 1. SQL Injection

```typescript
// ❌ MAL - Vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ BIEN - Usando Prisma (parametrizado)
const user = await prisma.user.findUnique({ where: { email } })

// ✅ BIEN - Si necesitas SQL raw
import { escapeSql } from '@/lib/security'
const safeEmail = escapeSql(email)
```

### 2. XSS (Cross-Site Scripting)

```typescript
// ❌ MAL - Renderizar HTML directamente
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ BIEN - Sanitizar primero
import { sanitizeString } from '@/lib/security'
const safe = sanitizeString(userInput)
<div>{safe}</div>

// ✅ BIEN - React escapa automáticamente
<div>{userInput}</div>
```

### 3. CSRF (Cross-Site Request Forgery)

```typescript
// Generar token al renderizar formulario
const csrfToken = generateCsrfToken()
// Guardar en sesión o cookie

// En el formulario
<input type="hidden" name="csrf" value={csrfToken} />

// Al procesar
if (!verifyCsrfToken(receivedToken, sessionToken)) {
  securityLogger.logCsrfViolation(userId, ip)
  return res.status(403).json({ error: 'CSRF validation failed' })
}
```

### 4. Prototype Pollution

```typescript
// ❌ MAL - Merge directo
Object.assign(target, untrustedSource)

// ✅ BIEN - Merge seguro
import { safeMerge } from '@/lib/security'
const merged = safeMerge(target, untrustedSource)
```

### 5. Path Traversal

```typescript
// ❌ MAL
const filename = req.query.file
fs.readFileSync(`/uploads/${filename}`)

// ✅ BIEN
import { sanitizeFilename } from '@/lib/security'
const safeFilename = sanitizeFilename(req.query.file)
const filepath = path.join('/uploads', safeFilename)
```

## 📝 Mejores Prácticas

### Para Desarrolladores

1. **Siempre sanitiza inputs del usuario**
   ```typescript
   const safeData = sanitizeFormData(req.body)
   ```

2. **Valida todos los datos antes de procesarlos**
   ```typescript
   if (!isValidEmail(email)) {
     return res.status(400).json({ error: 'Invalid email' })
   }
   ```

3. **Usa Prisma para queries** (previene SQL injection automáticamente)

4. **Nunca confíes en datos del cliente**
   ```typescript
   // ❌ No confiar en userId del body
   const { userId } = req.body
   
   // ✅ Usar userId de la sesión autenticada
   const userId = session.user.id
   ```

5. **Registra eventos de seguridad importantes**
   ```typescript
   securityLogger.logAdminAccess(adminId, path, action, ip)
   ```

6. **Implementa rate limiting en endpoints sensibles**

7. **Usa HTTPS en producción siempre**

### Para Administradores

1. **Revisa logs de seguridad diariamente**
   ```bash
   tail -f logs/security/security-$(date +%Y-%m-%d).log
   ```

2. **Monitoriza eventos críticos**
   ```typescript
   const stats = securityLogger.getStats()
   if (stats.bySeverity.critical > 0) {
     // Investigar inmediatamente
   }
   ```

3. **Mantén dependencias actualizadas**
   ```bash
   npm audit
   npm update
   ```

4. **Configura backups de logs**

5. **Revisa usuarios con rol admin regularmente**

6. **Implementa autenticación de dos factores (2FA)**

7. **Usa contraseñas fuertes** (mínimo 12 caracteres, mayúsculas, minúsculas, números, símbolos)

## 🔍 Debugging y Troubleshooting

### Ver Logs en Tiempo Real

```bash
# Todos los logs de seguridad de hoy
tail -f logs/security/security-$(date +%Y-%m-%d).log

# Solo eventos críticos
tail -f logs/security/security-$(date +%Y-%m-%d).log | grep '"severity":"critical"'

# Solo intentos de login fallidos
tail -f logs/security/security-$(date +%Y-%m-%d).log | grep 'LOGIN_FAILED'
```

### Analizar Logs

```bash
# Contar eventos por tipo
cat logs/security/security-2026-01-02.log | jq '.type' | sort | uniq -c

# Listar todas las IPs con eventos críticos
cat logs/security/security-2026-01-02.log | jq 'select(.severity=="critical") | .ip' | sort | uniq

# Ver detalles de todos los intentos de SQL injection
cat logs/security/security-2026-01-02.log | jq 'select(.type=="SQL_INJECTION_ATTEMPT")'
```

### Problemas Comunes

**1. Rate limit bloqueando usuarios legítimos**

Solución: Aumentar el límite o la ventana de tiempo

```typescript
'/api/': { requests: 100, window: 60000 } // De 50 a 100
```

**2. CSP bloqueando recursos necesarios**

Solución: Añadir dominio a la whitelist

```typescript
script-src 'self' https://nuevo-cdn.com;
```

**3. Logs creciendo demasiado**

Solución: Implementar rotación automática

```bash
# Comprimir logs antiguos
gzip logs/security/security-2026-01-01.log

# Eliminar logs de más de 90 días
find logs/security -name "*.log.gz" -mtime +90 -delete
```

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**📅 Última actualización**: Enero 2026  
**✍️ Autor**: Equipo OpositApp  
**🔒 Nivel de seguridad**: Producción Ready
