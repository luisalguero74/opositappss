# ACTIVACIÓN DEL SISTEMA DE SUSCRIPCIÓN - OPOSITAPP

**Fecha de creación:** 14 de enero de 2026  
**Estado actual:** Sistema implementado, pendiente de activación

---

## 📋 Estado Actual del Sistema

### ✅ **Implementado:**
- Sistema completo de suscripciones en código
- Base de datos preparada (modelos `Subscription`, `AppSettings`)
- Panel de administración en `/admin/monetization`
- Middleware de verificación de acceso
- API endpoints para gestión de suscripciones
- Banner de suscripción en interfaz usuario
- Integración con Stripe preparada

### ⚠️ **Pendiente:**
- Configurar cuenta Stripe con claves reales
- Activar el sistema (`monetizationEnabled: false` actualmente)
- Configurar variables de entorno en producción
- Pruebas con usuarios reales

---

## 🚀 Proceso de Activación Completo

### **PASO 1: Configurar Stripe (Proveedor de Pagos)**

#### **1.1 Crear/Configurar Cuenta Stripe**

1. **Acceder a Stripe:**
   - URL: https://dashboard.stripe.com
   - Crear cuenta o iniciar sesión con cuenta existente
   - Completar verificación de identidad y datos bancarios

2. **Activar modo producción:**
   - Por defecto estás en "Test Mode"
   - Cambiar a "Live Mode" (toggle en esquina superior derecha)
   - Completar verificación de negocio si es necesario

#### **1.2 Obtener Claves API**

1. **Navegar a API Keys:**
   - Dashboard → Developers → API keys
   
2. **Copiar claves (Live Mode):**
   ```
   Publishable key: pk_live_XXXXXXXXXXXXX
   Secret key: sk_live_XXXXXXXXXXXXX
   ```

3. **⚠️ IMPORTANTE:**
   - Nunca compartir `sk_live_` (clave secreta)
   - La clave pública `pk_live_` puede ser visible en frontend
   - Guardar claves en gestor de contraseñas seguro

#### **1.3 Crear Productos y Precios**

1. **Acceder a Products:**
   - Dashboard → Products → Add product

2. **Crear Plan Basic:**
   - Name: `OpositAPP Basic`
   - Description: `Acceso ilimitado a cuestionarios, estadísticas y foro premium`
   - Pricing:
     - Type: `Recurring`
     - Price: `9.99 EUR`
     - Billing period: `Monthly`
   - Save y copiar `Price ID` (price_XXXXX)

3. **Crear Plan Premium:**
   - Name: `OpositAPP Premium`
   - Description: `Todo lo de Basic + simulacros cronometrados, análisis avanzado y soporte prioritario`
   - Pricing:
     - Type: `Recurring`
     - Price: `19.99 EUR`
     - Billing period: `Monthly`
   - Save y copiar `Price ID` (price_YYYYY)

#### **1.4 Configurar Webhook**

1. **Navegar a Webhooks:**
   - Dashboard → Developers → Webhooks → Add endpoint

2. **Configurar endpoint:**
   ```
   Endpoint URL: https://www.opositapp.site/api/webhooks/stripe
   Description: Gestión de suscripciones OpositAPP
   ```

3. **Seleccionar eventos a escuchar:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`

4. **Copiar Webhook Secret:**
   - Después de crear: copiar `whsec_XXXXXXXXXXXXX`

---

### **PASO 2: Configurar Variables de Entorno**

#### **2.1 Variables Necesarias**

Añadir a `.env.production.local`:

```bash
# ============================================
# STRIPE - SISTEMA DE PAGOS (PRODUCCIÓN)
# ============================================
STRIPE_SECRET_KEY=sk_live_TU_CLAVE_SECRETA_AQUI
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_TU_CLAVE_PUBLICA_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI

# IDs de Productos Stripe
STRIPE_BASIC_PRICE_ID=price_XXXXXXXXXXXXX
STRIPE_PREMIUM_PRICE_ID=price_YYYYYYYYYYYYY

# Configuración adicional
STRIPE_SUCCESS_URL=https://www.opositapp.site/dashboard?payment=success
STRIPE_CANCEL_URL=https://www.opositapp.site/pricing?payment=cancelled
```

#### **2.2 Configurar en Vercel**

**Opción A: Desde Dashboard Vercel**
1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto `opositappss`
3. Settings → Environment Variables
4. Añadir cada variable:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_live_...`
   - Environment: `Production`
   - Save

**Opción B: Desde CLI**
```bash
# Desde la carpeta del proyecto
cd /Users/copiadorasalguero/opositapp

# Añadir variables una por una
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
npx vercel env add STRIPE_WEBHOOK_SECRET production
npx vercel env add STRIPE_BASIC_PRICE_ID production
npx vercel env add STRIPE_PREMIUM_PRICE_ID production

# Verificar variables
npx vercel env ls
```

#### **2.3 Re-desplegar**

```bash
# Rebuild con nuevas variables
npm run build

# Deploy a producción
npx vercel --prod
```

---

### **PASO 3: Activar Sistema desde Panel Admin**

#### **3.1 Acceder al Panel**

1. Navegar a: https://www.opositapp.site/admin/monetization
2. Iniciar sesión con credenciales de administrador

#### **3.2 Configurar Parámetros**

En la sección **"Configuración General"**:

| Campo | Valor Recomendado | Descripción |
|-------|-------------------|-------------|
| **Monetización Activada** | ✅ ON | Toggle principal del sistema |
| **Días de acceso gratuito** | `7` | Período de prueba para nuevos usuarios |
| **Precio Plan Basic** | `9.99` | Precio mensual Basic |
| **Precio Plan Premium** | `19.99` | Precio mensual Premium |
| **Moneda** | `EUR` | Euro (o USD, GBP según mercado) |

#### **3.3 Configuración Adicional (Opcional)**

En la misma página puedes activar/desactivar:

- **🎯 Google AdSense**: Mostrar anuncios (requiere ID AdSense)
- **🤝 Enlaces de Afiliados**: Amazon Associates, etc.
- **💝 Donaciones**: Ko-fi, Patreon
- **👥 Patrocinios**: Banners institucionales

#### **3.4 Guardar Configuración**

1. Revisar todos los valores
2. Click en **"💾 Guardar Configuración"**
3. Esperar mensaje de confirmación: "✅ Configuración guardada exitosamente"

---

### **PASO 4: Verificación y Pruebas**

#### **4.1 Crear Usuario de Prueba**

1. **Cerrar sesión de admin**
2. **Registrar nueva cuenta:**
   - Email: `test@opositapp.site` (o cualquier email de prueba)
   - Nombre, contraseña, etc.
3. **Verificar banner de suscripción:**
   - Debe aparecer: "Tienes X días restantes de prueba gratuita"
4. **Acceder a contenido:**
   - Todo debe estar accesible durante período gratuito

#### **4.2 Probar Flujo de Pago (Test Mode)**

**IMPORTANTE:** Usar tarjetas de prueba de Stripe:

```
Tarjeta exitosa:
  Número: 4242 4242 4242 4242
  Fecha: cualquier futura (ej: 12/28)
  CVC: cualquier 3 dígitos (ej: 123)
  ZIP: cualquier 5 dígitos (ej: 12345)

Tarjeta que falla:
  Número: 4000 0000 0000 0002
  (Resto igual)
```

**Flujo de prueba:**

1. Click en banner "Suscribirse"
2. Seleccionar plan (Basic o Premium)
3. Rellenar formulario Stripe con tarjeta de prueba
4. Confirmar pago
5. **Verificar:**
   - Redirección a `/dashboard?payment=success`
   - Banner de suscripción desaparece
   - Mensaje de bienvenida al plan

#### **4.3 Verificar desde Panel Admin**

1. Volver a `/admin/monetization`
2. **Revisar sección "Suscripciones Activas":**
   - Debe aparecer el usuario de prueba
   - Plan: Basic o Premium
   - Status: `active`
   - Fecha de fin de período

3. **Revisar métricas:**
   - Total suscriptores
   - Ingresos estimados mensuales
   - Distribución de planes

#### **4.4 Probar Vencimiento (Opcional)**

1. Desde admin, cambiar status de suscripción a `expired`
2. Hacer logout y login con usuario de prueba
3. **Verificar:**
   - Banner de suscripción reaparece
   - Acceso a contenido premium bloqueado (si aplica)

---

## 🔄 Flujo del Sistema de Suscripción

```
┌─────────────────────────────────────────────────────────────┐
│                   USUARIO NUEVO SE REGISTRA                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────────┐
                 │ Crear registro User │
                 │ createdAt = now()   │
                 └──────────┬──────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │ Verificar AppSettings:        │
            │ freeAccessDays = 7 (default)  │
            └───────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │ Usuario tiene 7 días acceso gratuito  │
        │ (createdAt + 7 días > now)            │
        └───────────┬───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────┐
    │ Middleware verifica en cada request:          │
    │                                               │
    │ IF (now > createdAt + freeAccessDays)         │
    │    AND subscription.status != 'active'        │
    │ THEN → Mostrar banner suscripción             │
    │        Bloquear contenido premium (opcional)  │
    │ ELSE → Acceso completo                        │
    └───────────┬───────────────────────────────────┘
                │
                ▼
        ┌───────────────┐         ┌──────────────────┐
        │ Usuario paga  │         │ Fin período free │
        │ suscripción   │         │ No suscripción   │
        └───────┬───────┘         └────────┬─────────┘
                │                          │
                ▼                          ▼
    ┌─────────────────────┐    ┌──────────────────────┐
    │ Stripe procesa pago │    │ Acceso limitado      │
    │ Webhook notifica    │    │ Banner permanente    │
    └──────────┬──────────┘    │ (hasta suscripción)  │
               │                └──────────────────────┘
               ▼
    ┌────────────────────────┐
    │ Crear/Actualizar       │
    │ Subscription:          │
    │ - status: 'active'     │
    │ - plan: 'basic/premium'│
    │ - currentPeriodEnd     │
    └──────────┬─────────────┘
               │
               ▼
    ┌────────────────────────┐
    │ Acceso completo        │
    │ Sin restricciones      │
    │ Banner desaparece      │
    └────────────────────────┘
```

---

## 🔐 Verificación de Acceso (Middleware)

El sistema verifica acceso en cada request:

```typescript
// Pseudocódigo del middleware
function checkAccess(user) {
  // 1. Usuario es admin → acceso total
  if (user.role === 'admin') return true
  
  // 2. Monetización desactivada → acceso total
  if (!appSettings.monetizationEnabled) return true
  
  // 3. Dentro de período gratuito → acceso total
  const daysSinceRegistration = (now - user.createdAt) / (1000*60*60*24)
  if (daysSinceRegistration <= appSettings.freeAccessDays) return true
  
  // 4. Tiene suscripción activa → acceso total
  if (user.subscription?.status === 'active') return true
  
  // 5. No cumple requisitos → acceso limitado
  return false
}
```

---

## 📊 Gestión desde Panel Admin

### **Acciones Disponibles en `/admin/monetization`:**

#### **Ver Suscripciones Activas:**
- Tabla con todos los usuarios suscritos
- Información: email, plan, fecha inicio, fecha fin
- Filtros por plan (Basic/Premium)
- Búsqueda por email

#### **Modificar Suscripción de Usuario:**
- Cambiar plan (Basic ↔ Premium)
- Cambiar estado (active/cancelled/expired)
- Extender período actual
- Cancelar suscripción

#### **Ver Métricas:**
- Total suscriptores activos
- Distribución por plan (X Basic, Y Premium)
- Ingresos mensuales estimados
- Tasa de conversión (registros → suscripciones)

#### **Exportar Datos:**
- Descargar CSV de suscriptores
- Reportes mensuales
- Historial de pagos

---

## 🛠️ Configuración Alternativa: Modo Manual (Sin Stripe)

Si prefieres NO usar Stripe automáticamente:

### **Opción 1: Todo Gratuito**
```
En /admin/monetization:
- Toggle "Monetización Activada" → OFF
- Todos los usuarios tienen acceso gratuito ilimitado
```

### **Opción 2: Suscripciones Manuales**
```
1. Mantener monetizationEnabled = true
2. Usuarios contactan por email/WhatsApp
3. Pagan por transferencia/Bizum
4. Admin crea suscripción manualmente:
   - Ir a /admin/monetization
   - Buscar usuario por email
   - Click "Activar Suscripción"
   - Seleccionar plan y duración
```

### **Opción 3: Híbrido (Ko-fi + Manual)**
```
1. Activar donationsEnabled = true
2. Configurar kofiUrl en AppSettings
3. Usuarios donan en Ko-fi
4. Admin verifica donación en Ko-fi
5. Admin activa suscripción manualmente
```

---

## 📞 Soporte y Troubleshooting

### **Problemas Comunes:**

#### **1. Webhook no recibe eventos**
```
Verificar:
- URL correcta en Stripe: https://www.opositapp.site/api/webhooks/stripe
- STRIPE_WEBHOOK_SECRET correcto en variables entorno
- Logs en Stripe Dashboard → Webhooks → Ver eventos
- Logs en Vercel → Functions → api/webhooks/stripe
```

#### **2. Pago exitoso pero suscripción no se activa**
```
Comprobar:
- Webhook funcionando (punto anterior)
- Price IDs correctos (STRIPE_BASIC_PRICE_ID, STRIPE_PREMIUM_PRICE_ID)
- Base de datos: revisar tabla Subscription
- Logs de aplicación en Vercel
```

#### **3. Usuario dice que pagó pero no tiene acceso**
```
Pasos:
1. Ir a /admin/monetization
2. Buscar usuario por email
3. Verificar status de suscripción
4. Si no existe: crear manualmente
5. Si existe pero expired: verificar fecha currentPeriodEnd
6. Si necesario: contactar Stripe Support
```

#### **4. Variables de entorno no se aplican**
```
Solución:
1. Verificar en Vercel Dashboard → Settings → Environment Variables
2. Asegurar que están en "Production"
3. Re-desplegar: npx vercel --prod
4. Esperar 2-3 minutos para propagación
5. Verificar logs: npx vercel logs
```

---

## 📝 Checklist de Activación

Usar esta lista para verificar que todo está configurado:

### **Pre-activación:**
- [ ] Cuenta Stripe creada y verificada
- [ ] Modo Live activado en Stripe
- [ ] Productos Basic y Premium creados
- [ ] Price IDs copiados
- [ ] Webhook configurado y probado
- [ ] Variables de entorno añadidas a Vercel
- [ ] Re-deployment realizado

### **Activación:**
- [ ] Accedido a /admin/monetization
- [ ] Toggle "Monetización Activada" → ON
- [ ] Días de prueba gratuita configurados (7)
- [ ] Precios configurados (9.99 / 19.99)
- [ ] Configuración guardada exitosamente

### **Verificación:**
- [ ] Usuario de prueba creado
- [ ] Banner de suscripción visible
- [ ] Acceso durante período gratuito funciona
- [ ] Flujo de pago con tarjeta de prueba exitoso
- [ ] Suscripción aparece en panel admin
- [ ] Webhook recibe eventos correctamente
- [ ] Métricas se actualizan en tiempo real

### **Post-activación:**
- [ ] Documentación de usuario actualizada
- [ ] Email de bienvenida configurado (opcional)
- [ ] Sistema de recordatorios (fin de período) configurado (opcional)
- [ ] Monitoreo de errores activo (Vercel logs)

---

## 🔗 Enlaces Útiles

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Testing:** https://stripe.com/docs/testing
- **Panel Monetización:** https://www.opositapp.site/admin/monetization
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Documentación Stripe:** https://stripe.com/docs
- **Stripe Support:** https://support.stripe.com

---

## 📅 Histórico de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-01-14 | Documento creado | Sistema |
| - | Pendiente activación | - |

---

**Última actualización:** 14 de enero de 2026  
**Archivo:** `/Users/copiadorasalguero/opositapp/ACTIVACION_SUSCRIPCION.md`
