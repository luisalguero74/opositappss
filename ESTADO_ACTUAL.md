# ✅ ESTADO ACTUAL - Generador de Preguntas

**Fecha:** 7 de enero de 2026  
**Estado:** ✅ **FUNCIONANDO CORRECTAMENTE**

---

## 🎉 PROBLEMA RESUELTO

**Problema:** Groq SDK no conectaba desde Vercel (Connection error)

**Solución exitosa:** Reemplazar `groq-sdk` por llamadas `fetch` directas a la API REST de Groq
- ✅ Funciona correctamente en Vercel
- ✅ Mayor compatibilidad con infraestructura serverless
- ✅ Mejor control sobre timeouts y reintentos
- ✅ Generación masiva de preguntas operativa

---

## 📝 CONFIGURACIÓN TÉCNICA

### API de Groq
- Método: `fetch` directo a https://api.groq.com/openai/v1/chat/completions
- Timeout: 60 segundos por petición
- Reintentos: 5 intentos con backoff exponencial (2s → 4s → 8s → 16s)
- Duración máxima función: 300 segundos

### Herramientas adicionales

### 1. Sistema de diagnóstico
- **URL:** https://opositappss.vercel.app/admin/diagnostics
- Verifica conexión BD, Groq API, variables de entorno

### 2. Reintentos y timeouts aumentados (RECIÉN DESPLEGADO)
- ⏱️ Timeout: **60 segundos** por petición (antes 10s)
- 🔄 **8 intentos totales** por tema antes de fallar
- 📈 Backoff exponencial: 2s → 4s → 8s → 16s
- ⏳ maxDuration: **300 segundos** (5 minutos función completa)

### 3. Sistema Export/Import funcionando
- ✅ 1140 preguntas ya importadas en producción
- Script local: `node export-questions-local.mjs`
- Import UI: `/admin/import-questions`

---

## 🚀 SISTEMA OPERATIVO

### Generador masivo funcionando
- **URL:** https://opositappss.vercel.app/admin/bulk-questions-generator
- **Estado:** Completamente funcional
- **Capacidad:** Generación automática por temas
- **Base de datos:** 1140+ preguntas en producción

### OPCIÓN B: Generar localmente (método garantizado)
```bash
# 1. Iniciar servidor local
npm run dev

# 2. Generar en: http://localhost:3000/admin/bulk-questions-generator

# 3. Exportar pCLAVE

- `app/api/admin/generate-bulk-questions/route.ts` - Generador con fetch directo
- `app/admin/bulk-questions-generator/page.tsx` - UI del generador
- `app/api/admin/diagnostics/route.ts` - Diagnóstico del sistema
- `export-questions-local.mjs` - Script de respaldo para exportación local
---

## 📋 ARCHIVOS MODIFICADOS RECIENTEMENTE

- `app/api/admin/generate-bulk-questions/route.ts` - Reintentos + timeouts
- `app/api/admin/diagnostics/route.ts` - Endpoint diagnóstico (NUEVO)
- `app/admin/diagnostics/page.tsx` - UI diagnóstico (NUEVO)
- `export-questions-local.mjs` - Script exportación (corregido)

---

## 🔍 COMANDOS ÚTILES

```bash
# Ver variables Vercel
npx vercel env ls

# Diagnosticar localmente
npm run dev
# Abrir: http://localhost:3000/admin/diagnostics

# Exportar preguntas locales
node export-questions-local.mjs

# Build y deploy
npm run build
npx vercel --prod --yes
```

---

## 🎥 AULAS VIRTUALES - CONFIGURADAS

**Problema resuelto:** Pantalla negra al unirse (variables LiveKit no configuradas)

### Variables LiveKit en Vercel
- ✅ `LIVEKIT_URL`: Configurada
- ✅ `LIVEKIT_API_KEY`: Configurada
- ✅ `LIVEKIT_API_SECRET`: Configurada

### Funcionalidades activas
- ✅ Crear y publicar aulas (admin con rol moderador)
- ✅ Video/audio funcionando
- ✅ Chat en tiempo real
- ✅ Menú flotante para salir
- ✅ Permisos de moderador

### URLs
- Admin: https://opositappss.vercel.app/admin (Gestionar Aulas)
- Usuario: https://opositappss.vercel.app/classrooms

---

## ⏰ CRON JOBS - CONFIGURADO

**Sistema de generación automática de preguntas configurado**

### Configuración
- ✅ Endpoint: `/api/cron/generate-questions`
- ✅ Schedule: Todos los días a las 3:00 AM UTC
- ✅ Variables: `CRON_SECRET`, `GROQ_API_KEY`
- ✅ Configurado en: `vercel.json`

### Funcionamiento
- Genera automáticamente 50 preguntas/día (5 temas × 10 preguntas)
- Prioriza temas con menos de 100 preguntas
- Crea cuestionarios no publicados

### Verificación
Ver documentación completa en: [CRON_CONFIGURACION.md](CRON_CONFIGURACION.md)

---

**ESTADO:** ✅ Sistema completamente funcional (Generador + Aulas + Cron).  
**PRÓXIMOS PASOS:** El cron generará preguntas automáticamente cada noche.
