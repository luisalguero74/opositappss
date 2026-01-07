# 🔄 ESTADO ACTUAL - Generador de Preguntas

**Fecha:** 7 de enero de 2026  
**Último cambio:** Implementación de reintentos y timeouts aumentados

---

## ❌ PROBLEMA PRINCIPAL

El **generador masivo de preguntas** falla en producción con error:
```
Connection error
```

### Causa identificada:
- Groq API **no conecta desde servidores de Vercel**
- La base de datos funciona perfectamente (1140 preguntas ya en producción)
- Variables de entorno configuradas correctamente
- El problema es específico de la conectividad Groq ↔ Vercel

---

## ✅ SOLUCIONES IMPLEMENTADAS

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

## 🎯 PRÓXIMOS PASOS AL VOLVER

### OPCIÓN A: Probar generador con nuevos reintentos
1. Ir a: **https://opositappss.vercel.app/admin/bulk-questions-generator**
2. Abrir consola del navegador (F12)
3. Intentar generar preguntas de un tema
4. Ver si los reintentos funcionan o sigue fallando

### OPCIÓN B: Generar localmente (método garantizado)
```bash
# 1. Iniciar servidor local
npm run dev

# 2. Generar en: http://localhost:3000/admin/bulk-questions-generator

# 3. Exportar preguntas locales
node export-questions-local.mjs

# 4. Importar en producción: /admin/import-questions
```

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

## ⚠️ SI SIGUE FALLANDO

Opciones alternativas:
1. **Cambiar a OpenAI** (más confiable pero de pago)
2. **Proxy/workaround** para Groq
3. **Continuar con método local** (funciona 100%)

---

**ESTADO:** Sistema funcional con método export/import.  
**PENDIENTE:** Verificar si reintentos solucionan conexión Groq en producción.
