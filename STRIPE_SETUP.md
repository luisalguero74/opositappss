# 💳 Configuración de Stripe para Monetización

## 📋 Requisitos Previos

- Cuenta de Stripe activa ([Crear cuenta](https://dashboard.stripe.com/register))
- Verificación de identidad completada en Stripe
- Acceso al archivo `.env` del proyecto

---

## 🔧 Pasos de Configuración

### 1. Obtener API Keys de Stripe

1. Inicia sesión en [Stripe Dashboard](https://dashboard.stripe.com)
2. Ve a **Developers → API keys**
3. Encontrarás dos tipos de keys:

   **Modo Test (Pruebas):**
   - `Publishable key`: `pk_test_...`
   - `Secret key`: `sk_test_...` (haz clic en "Reveal test key")

   **Modo Live (Producción):**
   - `Publishable key`: `pk_live_...`
   - `Secret key`: `sk_live_...`

4. Copia ambas keys y guárdalas temporalmente

### 2. Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto y agrega:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

⚠️ **IMPORTANTE**: Nunca compartas tu `STRIPE_SECRET_KEY` ni la subas a repositorios públicos.

### 3. Configurar Webhooks

Los webhooks permiten que Stripe notifique a tu aplicación sobre eventos de pago.

#### Para Desarrollo Local (ngrok):

1. Instala ngrok: `brew install ngrok` (macOS) o descarga desde [ngrok.com](https://ngrok.com)
2. Ejecuta: `ngrok http 3000`
3. Copia la URL generada (ej: `https://abc123.ngrok.io`)
4. En Stripe Dashboard → **Developers → Webhooks** → **Add endpoint**
5. Endpoint URL: `https://abc123.ngrok.io/api/webhooks/stripe`

#### Para Producción:

1. Endpoint URL: `https://tudominio.com/api/webhooks/stripe`

#### Eventos a Escuchar:

Selecciona estos eventos:
- ✅ `checkout.session.completed` - Usuario completó el pago
- ✅ `customer.subscription.updated` - Suscripción actualizada
- ✅ `customer.subscription.deleted` - Suscripción cancelada
- ✅ `invoice.payment_failed` - Fallo en el cobro

#### Obtener Webhook Secret:

1. Después de crear el endpoint, verás un **Signing secret**
2. Empieza con `whsec_...`
3. Cópialo y pégalo en `.env` como `STRIPE_WEBHOOK_SECRET`

---

## 🚀 Activar el Sistema

1. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Inicia sesión como administrador** en `/admin/monetization`

3. **Haz clic en "▶️ Activar Ahora"** para habilitar la monetización

4. **Verifica que funcione**:
   - Ve a `/pricing` (usuarios normales verán esta página)
   - Haz clic en "Suscribirme a Basic"
   - Deberías ser redirigido a Stripe Checkout

---

## 🧪 Probar Pagos en Modo Test

Usa estas tarjetas de prueba de Stripe:

| Tarjeta | Número | Resultado |
|---------|--------|-----------|
| Éxito | `4242 4242 4242 4242` | Pago exitoso |
| Requiere autenticación | `4000 0025 0000 3155` | Pago con 3D Secure |
| Fallo | `4000 0000 0000 0002` | Tarjeta rechazada |

**Datos adicionales para pruebas**:
- Fecha de expiración: Cualquier fecha futura (ej: 12/34)
- CVC: Cualquier 3 dígitos (ej: 123)
- Código postal: Cualquiera (ej: 12345)

---

## 📊 Flujo de Usuario

### Usuario Sin Suscripción:

1. Se registra → Tiene **7 días de prueba gratuita** (configurable)
2. Después del período de prueba:
   - Ve banner rojo: "🔒 Acceso Restringido"
   - Hace clic en "Suscribirme Ahora"
   - Es redirigido a `/pricing`
3. Selecciona un plan → Redirigido a Stripe Checkout
4. Completa el pago → Webhook activa su suscripción
5. Redirigido a `/dashboard?payment=success`

### Usuario Con Suscripción Activa:

- Ve banner azul: "🎉 Período de prueba" o no ve banner
- Tiene acceso completo a todas las funcionalidades

---

## 🛠️ Gestión Manual (Sin Stripe)

Si **NO** configuras Stripe:
- Los usuarios aún pueden registrarse y usar el período de prueba
- Después del trial, **no podrán pagar automáticamente**
- Debes asignar suscripciones manualmente desde `/admin/monetization`
- Útil para:
  - Probar el sistema sin procesar pagos reales
  - Gestionar pagos offline (transferencias, PayPal manual)
  - Ofrecer acceso gratuito a usuarios seleccionados

---

## 🔒 Seguridad

### ✅ Buenas Prácticas:

1. **Nunca expongas `STRIPE_SECRET_KEY`** en código frontend
2. **Verifica firmas de webhooks** (ya implementado en `/api/webhooks/stripe`)
3. **Usa HTTPS en producción** - Stripe rechaza webhooks HTTP
4. **Rota las keys** si crees que fueron comprometidas
5. **Monitorea el dashboard de Stripe** regularmente

### 🚨 Qué NO hacer:

- ❌ Subir `.env` a GitHub
- ❌ Hardcodear keys en el código
- ❌ Compartir keys en Slack/Discord
- ❌ Usar keys de producción en desarrollo

---

## 🔄 Cambiar de Test a Producción

Cuando estés listo para cobros reales:

1. En Stripe Dashboard, cambia de **Test mode** a **View live data**
2. Obtén las nuevas keys de producción (`pk_live_...` y `sk_live_...`)
3. Actualiza `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_tu_clave_de_produccion
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave_de_produccion
   ```
4. Crea un nuevo webhook para producción (URL real, no ngrok)
5. Actualiza `STRIPE_WEBHOOK_SECRET` con el nuevo signing secret
6. Reinicia el servidor
7. Prueba con una tarjeta real pequeña (€0.50) para verificar

---

## 📞 Soporte

- **Documentación de Stripe**: [docs.stripe.com](https://docs.stripe.com)
- **Dashboard de Stripe**: [dashboard.stripe.com](https://dashboard.stripe.com)
- **Soporte de Stripe**: Desde el dashboard, usa el chat de soporte

---

## ✅ Checklist de Verificación

Antes de activar en producción, verifica:

- [ ] Cuenta de Stripe verificada y activada
- [ ] API keys de producción configuradas en `.env`
- [ ] Webhook configurado con URL de producción
- [ ] Webhook secret actualizado en `.env`
- [ ] Servidor reiniciado después de cambios en `.env`
- [ ] Pago de prueba exitoso
- [ ] Webhook recibido correctamente (verifica logs de Stripe)
- [ ] Suscripción activada en la base de datos
- [ ] Banner de suscripción mostrándose correctamente
- [ ] Toggle de monetización activado en `/admin/monetization`

---

**¡Listo!** 🎉 Tu sistema de monetización está configurado y funcionando.
