# 🔐 Credenciales y Servicios Externos - OpositApp

**📅 Fecha de creación**: 2 de enero de 2026  
**⚠️ CONFIDENCIAL**: Este archivo contiene información sensible. No compartir ni subir a repositorios públicos.

---

## 📊 Índice

1. [Base de Datos PostgreSQL](#base-de-datos-postgresql)
2. [Autenticación NextAuth](#autenticación-nextauth)
3. [Servicio de Email Gmail](#servicio-de-email-gmail)
4. [LiveKit (Aulas Virtuales)](#livekit-aulas-virtuales)
5. [Stripe (Pagos)](#stripe-pagos)
6. [Groq AI (Generación IA)](#groq-ai-generación-ia)
7. [Usuarios de la Aplicación](#usuarios-de-la-aplicación)
8. [Resumen de Conexiones](#resumen-de-conexiones)

---

## 🗄️ Base de Datos PostgreSQL

### Información de Conexión

- **Servicio**: PostgreSQL (Local)
- **Host**: localhost
- **Puerto**: 5432
- **Base de datos**: opositappss

### Credenciales

```
Usuario: opositapp
Contraseña: password
```

### URL de Conexión Completa

```
postgresql://opositapp:password@localhost:5432/opositappss
```

### Variable de Entorno

```bash
DATABASE_URL="postgresql://opositapp:password@localhost:5432/opositappss"
```

### Acceso desde Terminal

```bash
psql postgresql://opositapp:password@localhost:5432/opositappss
```

---

## 🔑 Autenticación NextAuth

### Información del Servicio

- **Librería**: NextAuth.js
- **URL de la aplicación**: http://localhost:3000
- **Uso**: Sistema de autenticación de usuarios

### Credenciales

```
Secret Key: opositapp-secret-key-2025
```

### Variables de Entorno

```bash
NEXTAUTH_SECRET="opositapp-secret-key-2025"
NEXTAUTH_URL="http://localhost:3000"
```

### Notas

- En producción, cambiar NEXTAUTH_URL a la URL real del dominio
- La NEXTAUTH_SECRET debe ser única y segura (mínimo 32 caracteres aleatorios)

---

## 📧 Servicio de Email Gmail

### Información del Servicio

- **Proveedor**: Gmail SMTP
- **Email**: luisalguero74@gmail.com
- **Uso**: Envío de emails (verificación, notificaciones, etc.)

### Credenciales

```
Email: luisalguero74@gmail.com
App Password: tu-app-password
```

### Configuración SMTP

```
Host: smtp.gmail.com
Puerto: 587 (TLS) o 465 (SSL)
Seguridad: TLS/SSL
```

### Variables de Entorno

```bash
EMAIL_USER=luisalguero74@gmail.com
EMAIL_PASS="tu-app-password"
```

### Cómo Obtener App Password

1. Ir a https://myaccount.google.com/security
2. Activar "Verificación en 2 pasos" si no está activada
3. Ir a "Contraseñas de aplicaciones"
4. Generar nueva contraseña para "Correo" / "Otro dispositivo"
5. Copiar la contraseña de 16 dígitos generada

### Notas

⚠️ **IMPORTANTE**: No usar la contraseña regular de Gmail, siempre usar App Password.

---

## 🎥 LiveKit (Aulas Virtuales)

### Información del Servicio

- **Proveedor**: LiveKit Cloud
- **Dashboard**: https://cloud.livekit.io/
- **Uso**: Videollamadas y aulas virtuales en tiempo real

### Credenciales

```
URL: wss://opositapp-8kbpve4p.livekit.cloud
API Key: API2jUGHVJw2ugL
API Secret: API2jUGHVJw2ugL
```

### Variables de Entorno

```bash
LIVEKIT_URL=wss://opositapp-8kbpve4p.livekit.cloud
LIVEKIT_API_KEY=API2jUGHVJw2ugL
LIVEKIT_API_SECRET=API2jUGHVJw2ugL
```

### Acceso al Dashboard

1. Ir a https://cloud.livekit.io/
2. Iniciar sesión con la cuenta asociada al proyecto
3. Proyecto: opositapp-8kbpve4p

### Funcionalidades

- Aulas virtuales en tiempo real
- Video y audio
- Chat de texto
- Compartir pantalla
- Grabación de sesiones

### Plan

- **Plan Free**: Incluye 10,000 minutos/mes gratis
- **Costos adicionales**: Según uso después de límite gratuito

---

## 💳 Stripe (Pagos)

### Información del Servicio

- **Proveedor**: Stripe
- **Dashboard**: https://dashboard.stripe.com
- **Uso**: Procesamiento de pagos y suscripciones

### Credenciales (MODO TEST)

```
Secret Key (Test): sk_test_tu_clave_secreta_aqui
Publishable Key (Test): pk_test_tu_clave_publica_aqui
Webhook Secret: whsec_tu_webhook_secret_aqui
```

### Variables de Entorno

```bash
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

### Acceso al Dashboard

1. Ir a https://dashboard.stripe.com
2. Iniciar sesión con la cuenta del proyecto
3. **Developers → API keys** para ver/obtener keys
4. **Developers → Webhooks** para configurar webhooks

### Obtener Credenciales Reales

1. Ir a Dashboard de Stripe
2. Navegar a **Developers → API keys**
3. Copiar las keys del **Modo Test** o **Modo Live**
4. Para webhook: **Developers → Webhooks → Add endpoint**
   - URL: `https://tudominio.com/api/webhooks/stripe`
   - Eventos: checkout.session.completed, customer.subscription.*

### Tarjetas de Prueba (Modo Test)

```
Éxito: 4242 4242 4242 4242
Requiere 3D Secure: 4000 0025 0000 3155
Fallo: 4000 0000 0000 0002

CVC: Cualquier 3 dígitos
Fecha: Cualquier fecha futura
```

### Estado Actual

⚠️ **PENDIENTE**: Las credenciales mostradas son placeholders. Necesitas:
1. Crear cuenta en Stripe
2. Obtener tus API keys reales
3. Actualizar variables de entorno

---

## 🤖 Groq AI (Generación IA)

### Información del Servicio

- **Proveedor**: Groq
- **Console**: https://console.groq.com
- **Uso**: Generación de preguntas con IA (LLaMA 3.3 70B)

### Credenciales

```
API Key: gsk_REDACTED
```

### Variable de Entorno

```bash
GROQ_API_KEY=gsk_REDACTED
```

### Acceso al Console

1. Ir a https://console.groq.com
2. Iniciar sesión con tu cuenta
3. **API Keys** para ver/regenerar keys
4. **Billing** para monitorear uso

### Especificaciones del Servicio

- **Modelo**: llama-3.3-70b-versatile
- **Endpoint**: https://api.groq.com/openai/v1/chat/completions
- **Rate Limit**: 30 requests/minuto (plan gratuito)
- **Costo**: GRATIS con límites generosos

### Uso en la Aplicación

- Generación automática de preguntas por tema
- Asistente de estudio con IA
- Explicaciones personalizadas
- Generación nocturna automatizada (cron)

### Monitoreo de Uso

```bash
# Ver uso en tiempo real
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Límites del Plan Gratuito

- 30 requests por minuto
- 14,400 requests por día
- Suficiente para la mayoría de casos de uso

---

## 👥 Usuarios de la Aplicación

### Usuario Administrador

```
Email: alguero2@yahoo.com
Rol: admin
Nombre: (No especificado)
```

**Contraseña**: La que se estableció durante el registro. Si no la recuerdas, puedes resetearla desde:
1. Base de datos directamente
2. Función de recuperación de contraseña
3. Script de reset de admin

**Permisos**:
- ✅ Acceso a `/admin/*`
- ✅ Gestión de usuarios
- ✅ Creación/edición de contenido
- ✅ Configuración del sistema
- ✅ Acceso a estadísticas globales
- ✅ Gestión de suscripciones
- ✅ Logs de seguridad

### Usuario Regular

```
Email: luisalguero74@gmail.com
Rol: user
Nombre: (No especificado)
```

**Contraseña**: La que se estableció durante el registro.

**Permisos**:
- ✅ Acceso a dashboard
- ✅ Realizar tests y supuestos
- ✅ Estadísticas personales
- ✅ Foro y aulas virtuales
- ✅ Asistente de estudio
- ❌ Sin acceso a `/admin`

### Resetear Contraseña de Administrador

Si necesitas resetear la contraseña del administrador:

```bash
# Opción 1: Desde la base de datos
psql postgresql://opositapp:password@localhost:5432/opositappss

# En psql:
# Generar hash bcrypt de nueva contraseña en: https://bcrypt-generator.com/
# Luego actualizar:
UPDATE "User" SET password = '$2a$10$HASH_GENERADO_AQUI' WHERE email = 'alguero2@yahoo.com';
```

```bash
# Opción 2: Script Node.js
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('nueva_contraseña', 10));"
```

---

## 🌐 Resumen de Conexiones

### Servicios Activos y Configurados

| Servicio | Estado | URL/Host | Requiere Cuenta |
|----------|--------|----------|-----------------|
| PostgreSQL | ✅ Activo | localhost:5432 | No (local) |
| NextAuth | ✅ Activo | localhost:3000 | No |
| Gmail SMTP | ⚠️ Pendiente App Password | smtp.gmail.com:587 | Sí |
| LiveKit | ✅ Activo | opositapp-8kbpve4p.livekit.cloud | Sí |
| Stripe | ⚠️ Pendiente keys reales | dashboard.stripe.com | Sí |
| Groq AI | ✅ Activo | api.groq.com | Sí |

### Puertos en Uso

```
3000  - Next.js Application
5432  - PostgreSQL Database
587   - Gmail SMTP (outbound)
```

### URLs Importantes

```
Aplicación Local:     http://localhost:3000
Panel Admin:          http://localhost:3000/admin
Dashboard Usuario:    http://localhost:3000/dashboard
PostgreSQL:           postgresql://localhost:5432/opositappss

LiveKit Dashboard:    https://cloud.livekit.io/
Stripe Dashboard:     https://dashboard.stripe.com
Groq Console:         https://console.groq.com
Gmail Settings:       https://myaccount.google.com/security
```

### Archivos de Configuración

```
.env                          - Variables de entorno principales
.env.demo.example             - Template para demo
docker-compose.demo.yml       - Configuración Docker para demo
prisma/schema.prisma          - Esquema de base de datos
middleware.ts                 - Configuración de seguridad
```

---

## 🔒 Seguridad

### Variables Sensibles

⚠️ **NUNCA COMPARTIR**:
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `GROQ_API_KEY`
- `LIVEKIT_API_SECRET`
- `EMAIL_PASS`
- `DATABASE_URL` con contraseñas

### Archivos a Excluir de Git

Asegúrate que `.gitignore` incluye:
```
.env
.env.local
.env.production
logs/security/
```

### Rotación de Credenciales

Se recomienda rotar estas credenciales cada:
- **NEXTAUTH_SECRET**: Cada 6 meses o si hay brecha de seguridad
- **API Keys**: Cada 12 meses o si se sospecha compromiso
- **Contraseñas de usuarios**: Obligar cambio cada 90 días (admins)

### Backup de Credenciales

1. Guardar este archivo en gestor de contraseñas (1Password, LastPass, Bitwarden)
2. Mantener copia offline encriptada
3. No almacenar en repositorios Git
4. Compartir solo con personal autorizado

---

## 📝 Checklist de Configuración

### Servicios Pendientes de Configurar

- [ ] **Gmail App Password**: Generar y actualizar en `.env`
- [ ] **Stripe Keys Reales**: Obtener de dashboard y actualizar
- [ ] **Stripe Webhook**: Configurar endpoint en producción
- [ ] **Contraseñas de Usuarios**: Verificar que ambos usuarios pueden acceder
- [ ] **NEXTAUTH_SECRET**: Cambiar por una más segura en producción
- [ ] **Backup de Base de Datos**: Configurar backups automáticos

### Verificación de Servicios

```bash
# 1. PostgreSQL
psql postgresql://opositapp:password@localhost:5432/opositappss -c "SELECT 1;"

# 2. Groq AI
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# 3. Next.js
curl http://localhost:3000/api/health

# 4. Email (requiere servidor corriendo)
# Probar desde la aplicación en /admin/settings

# 5. LiveKit (requiere servidor corriendo)
# Probar creando un aula virtual en /classroom
```

---

## 🆘 Contactos de Soporte

### Servicios Externos

- **LiveKit Support**: https://livekit.io/support
- **Stripe Support**: https://support.stripe.com
- **Groq Support**: support@groq.com
- **Gmail/Google**: https://support.google.com

### Documentación Oficial

- **LiveKit Docs**: https://docs.livekit.io
- **Stripe Docs**: https://stripe.com/docs
- **Groq Docs**: https://console.groq.com/docs
- **NextAuth Docs**: https://next-auth.js.org
- **Prisma Docs**: https://www.prisma.io/docs

---

**🔐 Fin del Documento - Mantener Seguro y Actualizado**
