# 🚀 Deployment en Vercel + Supabase

## ✅ Pre-requisitos Completados

- [x] Código funcionando localmente
- [x] Build sin errores (`npm run build`)
- [x] Variables de entorno documentadas (`.env.example`)
- [x] Repositorio Git configurado (branch `main`)

---

## 📋 Checklist de Deployment (30-45 minutos)

### FASE 1: Preparar Repositorio GitHub (5 min)

- [ ] **1.1** Verificar que `.env` está en `.gitignore`
  ```bash
  cat .gitignore | grep ".env"
  # Debe aparecer: .env, .env.local, .env*.local
  ```

- [ ] **1.2** Commit y push del código actual
  ```bash
  git add .
  git commit -m "Preparado para deployment en Vercel"
  git push origin main
  ```

- [ ] **1.3** Verificar en GitHub que el código está actualizado
  - Visita: https://github.com/tu-usuario/opositapp
  - Confirma que ves el último commit

---

### FASE 2: Configurar Base de Datos Supabase (10 min)

- [ ] **2.1** Crear cuenta gratuita en Supabase
  - Visita: https://supabase.com
  - Sign up con GitHub (más rápido)

- [ ] **2.2** Crear nuevo proyecto
  - Name: `opositapp-production`
  - Database Password: **GUARDA ESTA CONTRASEÑA** (la necesitarás)
  - Region: `Europe West (Ireland)` (más cercano a España)
  - Plan: Free (500MB, suficiente para empezar)

- [ ] **2.3** Obtener DATABASE_URL
  - En Supabase → Settings → Database
  - Connection String → URI
  - Copiar URL completa (tipo: `postgresql://postgres:[PASSWORD]@...`)
  - **IMPORTANTE**: Reemplaza `[PASSWORD]` con tu contraseña real

- [ ] **2.4** Migrar esquema de base de datos
  ```bash
  # Guarda tu DATABASE_URL de Supabase temporalmente
  export DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxx.supabase.co:5432/postgres"
  
  # Ejecuta migraciones
  npx prisma migrate deploy
  
  # Genera cliente Prisma
  npx prisma generate
  ```

- [ ] **2.5** Verificar tablas creadas
  - En Supabase → Table Editor
  - Deberías ver: User, Topic, Questionnaire, Question, etc.

---

### FASE 3: Configurar Cuenta Vercel (5 min)

- [ ] **3.1** Crear cuenta gratuita en Vercel
  - Visita: https://vercel.com
  - Sign up con GitHub (más rápido)
  - Autoriza acceso a tu repositorio

- [ ] **3.2** Importar proyecto
  - Dashboard → Add New → Project
  - Buscar: `opositapp`
  - Click: Import

- [ ] **3.3** Configurar proyecto (NO DESPLEGAR AÚN)
  - Framework Preset: `Next.js`
  - Root Directory: `./` (dejar por defecto)
  - Build Command: `npm run build` (dejar por defecto)
  - Output Directory: `.next` (dejar por defecto)
  - Install Command: `npm install` (dejar por defecto)

---

### FASE 4: Configurar Variables de Entorno en Vercel (10 min)

**IMPORTANTE**: Antes de desplegar, configura TODAS las variables.

- [ ] **4.1** En Vercel → Project Settings → Environment Variables

- [ ] **4.2** Agregar variables una por una:

  **DATABASE_URL** (Supabase)
  ```
  postgresql://postgres:TU_PASSWORD@db.xxx.supabase.co:5432/postgres
  ```

  **NEXTAUTH_SECRET** (Generar nuevo)
  ```bash
  # Ejecuta en terminal local:
  openssl rand -base64 32
  # Copia el resultado y pégalo en Vercel
  ```

  **NEXTAUTH_URL** (Tu dominio)
  ```
  https://tudominio.com
  # O si usas dominio de Vercel:
  https://opositapp.vercel.app
  ```

  **EMAIL_USER**
  ```
  tucorreo@gmail.com
  ```

  **EMAIL_PASS** (App Password de Gmail)
  ```
  xxxx-xxxx-xxxx-xxxx
  # Obtener en: https://myaccount.google.com/apppasswords
  # 1. Habilita verificación en 2 pasos
  # 2. Genera App Password para "Mail"
  # 3. Copia el código de 16 caracteres
  ```

  **LIVEKIT_URL**
  ```
  wss://tu-proyecto.livekit.cloud
  # Puedes usar el mismo de local por ahora
  ```

  **LIVEKIT_API_KEY**
  ```
  (tu key actual)
  ```

  **LIVEKIT_API_SECRET**
  ```
  (tu secret actual)
  ```

  **GROQ_API_KEY**
  ```
  gsk_tu_api_key_aqui
  # Puedes usar el mismo de local
  ```

  **STRIPE_SECRET_KEY** (IMPORTANTE: Usar TEST keys)
  ```
  sk_test_tu_clave_secreta_aqui
  ```

  **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
  ```
  pk_test_tu_clave_publica_aqui
  ```

  **STRIPE_WEBHOOK_SECRET**
  ```
  whsec_xxx
  # Configuraremos esto DESPUÉS del primer deployment
  ```

- [ ] **4.3** Verificar que todas las variables están configuradas
  - Deberías tener 12 variables en total
  - Environment: Production (y opcionalmente Preview/Development)

---

### FASE 5: Primer Deployment (5 min)

- [ ] **5.1** Hacer deploy
  - En Vercel → Deployments
  - Click: "Deploy" (botón azul)
  - Espera 1-2 minutos...

- [ ] **5.2** Verificar build exitoso
  - Status: ✓ Ready
  - Si hay errores, revisar logs de build

- [ ] **5.3** Visitar tu sitio
  - Click en el dominio: `https://opositapp.vercel.app`
  - Verifica que carga correctamente

---

### FASE 6: Configurar Dominio Personalizado (5 min)

- [ ] **6.1** Agregar dominio en Vercel
  - Project Settings → Domains
  - Add: `tudominio.com`
  - Add también: `www.tudominio.com`

- [ ] **6.2** Configurar DNS en tu proveedor de dominio
  - Vercel te dará instrucciones específicas
  - Tipo A → IP de Vercel
  - O tipo CNAME → cname.vercel-dns.com
  - **Propagación DNS**: 5 minutos - 48 horas (usualmente <1 hora)

- [ ] **6.3** Actualizar NEXTAUTH_URL
  - En Vercel → Environment Variables
  - Editar NEXTAUTH_URL: `https://tudominio.com`
  - Redeploy: Deployments → ... → Redeploy

---

### FASE 7: Configurar Stripe Webhooks (Opcional, 5 min)

**Solo si vas a activar pagos en producción:**

- [ ] **7.1** Crear webhook en Stripe
  - Dashboard Stripe → Developers → Webhooks
  - Add endpoint: `https://tudominio.com/api/webhooks/stripe`
  - Events to send:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`

- [ ] **7.2** Copiar Webhook Secret
  - Stripe te mostrará: `whsec_xxx...`
  - Copiar valor

- [ ] **7.3** Actualizar en Vercel
  - Environment Variables → STRIPE_WEBHOOK_SECRET
  - Pegar nuevo valor
  - Redeploy

---

### FASE 8: Seed de Base de Datos (5 min)

- [ ] **8.1** Acceder al admin
  - Visita: `https://tudominio.com/admin`
  - Si no existe usuario admin, créalo desde Supabase:
    ```sql
    UPDATE "User" SET role = 'ADMIN' 
    WHERE email = 'tucorreo@gmail.com';
    ```

- [ ] **8.2** Ejecutar seed
  - Admin → Documentos
  - Click: "Cargar Documentos Iniciales" (o usar API)
  - O desde terminal local:
    ```bash
    curl -X POST https://tudominio.com/api/admin/documents/seed
    ```

- [ ] **8.3** Verificar datos cargados
  - Supabase → Table Editor → LegalDocument
  - Deberías ver 32 documentos

---

### FASE 9: Verificación Final (5 min)

- [ ] **9.1** Pruebas funcionales
  - [ ] Registro de usuario nuevo
  - [ ] Login con usuario existente
  - [ ] Navegación entre páginas
  - [ ] Temario carga correctamente
  - [ ] Test de preguntas funciona
  - [ ] Asistente IA responde
  - [ ] Estadísticas se muestran

- [ ] **9.2** Verificar logs
  - Vercel → Functions → Runtime Logs
  - Revisar errores si los hay

- [ ] **9.3** Verificar métricas
  - Vercel → Analytics
  - Supabase → Database → Usage

---

## ✅ POST-DEPLOYMENT

### Seguridad Inmediata

- [ ] Cambiar todas las contraseñas de desarrollo por producción
- [ ] Generar nuevo NEXTAUTH_SECRET único
- [ ] Usar App Password Gmail dedicado (no reutilizar)
- [ ] Habilitar 2FA en Vercel y Supabase

### Monitoreo

- [ ] Configurar alertas en Vercel (límites de uso)
- [ ] Configurar alertas en Supabase (límites de BD)
- [ ] Revisar logs diariamente primeros 3 días

### Optimizaciones Futuras

- [ ] Configurar Stripe modo LIVE (cuando estés listo)
- [ ] Agregar Google Analytics
- [ ] Configurar backups automáticos (Supabase Pro)
- [ ] Configurar dominio email personalizado

---

## 🆘 Troubleshooting

### Error: Build Failed

```bash
# Verifica localmente:
npm run build

# Si falla, corrige errores y push:
git add .
git commit -m "Fix build errors"
git push
```

### Error: Database Connection

- Verificar DATABASE_URL en Vercel
- Verificar que Supabase permite conexiones (Settings → Database → Connection Pooling)
- Verificar que migraciones se ejecutaron: `npx prisma migrate deploy`

### Error: NextAuth CSRF

- Verificar NEXTAUTH_URL apunta a tu dominio real
- Verificar NEXTAUTH_SECRET está configurado
- Redeploy después de cambiar variables

### Stripe no funciona

- Verificar que STRIPE_WEBHOOK_SECRET está actualizado
- Verificar URL del webhook en Stripe: `https://tudominio.com/api/webhooks/stripe`
- Revisar logs en Stripe → Developers → Webhooks → [tu webhook]

---

## 📊 Costos Estimados

### Plan Inicial (GRATIS)
- Vercel Hobby: $0/mes
- Supabase Free: $0/mes
- **Total: $0/mes**

Límites:
- 100GB bandwidth/mes (Vercel)
- 500MB database (Supabase)
- 50,000 monthly active users (Supabase)

### Cuando crezcas (Recomendado a partir de 100 usuarios)
- Vercel Pro: $20/mes
- Supabase Pro: $25/mes
- **Total: $45/mes**

Incluye:
- 1TB bandwidth/mes
- 8GB database
- Backups automáticos diarios
- Soporte prioritario

---

## 🎯 Próximos Pasos Después de Deployment

1. **Prueba completa** con usuarios reales (2-3 personas de confianza)
2. **Recolecta feedback** primeros 7 días
3. **Monitorea errores** en Vercel Functions logs
4. **Optimiza rendimiento** según métricas reales
5. **Considera upgrade** cuando llegues a 300-500 usuarios activos

---

## 📞 Soporte

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **Next.js**: https://nextjs.org/docs

---

**¡Listo para producción!** 🚀
