# 🎥 Configurar LiveKit para Aulas Virtuales

## ❌ Problema Actual

Las aulas virtuales muestran pantalla negra porque **faltan variables de entorno de LiveKit en Vercel**.

---

## ✅ Solución: Configurar Variables de Entorno

### 1️⃣ Obtener credenciales de LiveKit

Tienes dos opciones:

#### Opción A: Usar LiveKit Cloud (Recomendado - Gratis)
1. Ve a: https://cloud.livekit.io/
2. Crea una cuenta (gratis)
3. Crea un nuevo proyecto
4. Copia las credenciales:
   - **LIVEKIT_URL** (ej: `wss://tu-proyecto.livekit.cloud`)
   - **LIVEKIT_API_KEY** (ej: `APIxxxxxxxxxx`)
   - **LIVEKIT_API_SECRET** (ej: `xxxxxxxxxxxxxxxx`)

#### Opción B: Servidor LiveKit propio
Si ya tienes un servidor LiveKit:
- Usa tu URL y credenciales existentes

---

### 2️⃣ Configurar en Vercel

Ejecuta estos comandos con tus credenciales:

```bash
cd /Users/copiadorasalguero/opositapp

# Configurar LIVEKIT_URL
npx vercel env add LIVEKIT_URL production
# Cuando te pida el valor, pega: wss://tu-proyecto.livekit.cloud

# Configurar LIVEKIT_API_KEY
npx vercel env add LIVEKIT_API_KEY production
# Cuando te pida el valor, pega tu API Key

# Configurar LIVEKIT_API_SECRET
npx vercel env add LIVEKIT_API_SECRET production
# Cuando te pida el valor, pega tu API Secret
```

---

### 3️⃣ Redesplegar la aplicación

```bash
npx vercel --prod --yes
```

Esto recargará las variables de entorno.

---

## 🧪 Verificar que funciona

1. **Crear un aula** (como admin):
   - Ve a: `/admin` → "Gestionar Aulas Virtuales"
   - Crea un aula y publícala

2. **Unirse al aula** (como usuario):
   - Ve a: `/classrooms`
   - Click en el aula
   - Deberías ver video/audio (no pantalla negra)

3. **Verificar permisos de moderador** (admin):
   - Como admin, deberías ver opciones adicionales
   - Silenciar participantes
   - Expulsar participantes
   - Gestionar sala

---

## 🔍 Diagnóstico

Para verificar las variables están configuradas:

```bash
npx vercel env ls
```

Deberías ver:
- LIVEKIT_URL
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET

---

## 📝 Configuración Local (opcional)

Si quieres probar localmente, crea un archivo `.env.local`:

```bash
LIVEKIT_URL=wss://tu-proyecto.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx
```

Luego ejecuta:
```bash
npm run dev
```

---

## ⚠️ Notas Importantes

1. **LiveKit Cloud gratuito** incluye:
   - Hasta 50 participantes simultáneos
   - 100 horas de minutos al mes
   - Perfecto para comenzar

2. **Seguridad:**
   - Nunca expongas las credenciales en el código
   - Solo en variables de entorno de Vercel/local

3. **Troubleshooting:**
   - Si sigue pantalla negra: verifica permisos de cámara/micrófono en el navegador
   - Revisa la consola del navegador (F12) para errores

---

**Estado actual:** ❌ Variables NO configuradas en Vercel  
**Próximo paso:** Ejecutar comandos del punto 2️⃣
