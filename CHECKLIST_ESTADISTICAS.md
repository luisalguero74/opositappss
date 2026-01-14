# 📋 CHECKLIST - Mantenimiento de Estadísticas

**Última actualización:** 14 de enero de 2026

---

## ✅ VERIFICACIONES DIARIAS

### Cada mañana (5 minutos):
```bash
# Ejecutar desde la raíz del proyecto:
bash test-statistics.sh
```

**Resultado esperado:**
```
✅ API está en línea
✅ Ruta /api/statistics existe
✅ Build presente
```

---

## 🔍 SEÑALES DE ALERTA

### Si ves estos errores, el problema está de vuelta:

#### Error 1: "Failed to fetch statistics"
```
Síntoma: GET /api/statistics → 500 status
Logs: Error: "Field 'answer' not found"
Causa: Campo 'answer' fue agregado nuevamente al select
Solución: Remover 'answer: true' de la query (línea ~120)
```

#### Error 2: Estadísticas vacías
```
Síntoma: totalQuestions = 0 aunque hay respuestas
Logs: "[Statistics] Total answers: 0 | Valid: 0"
Causa: Las respuestas no tienen pregunta asociada
Solución: Revisar integridad de BD, ejecutar:
  npx prisma db pull
  npx prisma migrate
```

#### Error 3: Inconsistencia de respuestas
```
Síntoma: saveAnswers retorna 23 pero estadísticas muestra 0
Logs: "[Statistics] savedAnswers != validAnswers"
Causa: Hay orfandad de datos (respuesta sin pregunta)
Solución: Revisar que POST /api/submit-answers guarde correctamente
```

---

## 🛠️ ACCIONES DE MANTENIMIENTO

### Mensual:
1. Revisar logs de Vercel
   - https://vercel.com/opositappss/opositapp/logs
   - Buscar errores con "statistics"

2. Ejecutar test manual:
   ```bash
   # En navegador, cuando autenticado:
   fetch('/api/statistics').then(r => r.json()).then(d => {
     console.log('✅ OK:', d.general.totalQuestions, 'preguntas')
   }).catch(e => console.error('❌ ERROR:', e))
   ```

3. Verificar Prisma schema
   ```bash
   npx prisma db pull  # Sincroniza con BD
   npx prisma generate  # Regenera tipos
   ```

### Trimestralmente:
1. Revisar archivos relacionados:
   - `app/api/statistics/route.ts` - Lógica principal
   - `app/api/submit-answers/route.ts` - Donde se guardan
   - `app/statistics/page.tsx` - Interfaz de usuario
   - `SOLUCION_PERMANENTE_ESTADISTICAS.md` - Documentación

2. Ejecutar:
   ```bash
   npm run build
   npm run test  # Si existen tests
   ```

3. Verificar en staging antes de producción

---

## 📊 MONITOREO EN TIEMPO REAL

### Vercel Analytics
1. Ir a: https://vercel.com/opositappss/opositapp
2. Buscar errores en `/api/statistics`
3. Alertas activadas para 500+ status

### Logs del servidor
Ver en: `app/api/statistics/route.ts`
```typescript
console.log('[Statistics] Query error:', {
  message: queryError?.message,
  code: queryError?.code
})
```

Buscar en Vercel logs: `[Statistics]`

---

## 🎯 REGLAS DE ORO

### ❌ NUNCA hacer esto:
1. **NO agregar `answer: true` al select de Prisma**
   - Causa: Error "Field 'answer' not found"
   - Solución: Dejar como está

2. **NO cambiar nombres de campos sin migraciones**
   - Causa: Inconsistencia con schema
   - Solución: Usar `npx prisma migrate`

3. **NO hacer queries sin try-catch**
   - Causa: Ruta completa falla
   - Solución: Siempre agregar fallback

### ✅ SIEMPRE hacer esto:
1. **Ejecutar test después de cambios**
   ```bash
   npm run build
   bash test-statistics.sh
   ```

2. **Revisar comentarios en el código**
   - Están marcados con `❌ IMPORTANTE`
   - Explican por qué cada línea está así

3. **Sincronizar schema regularmente**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

---

## 📞 CONTACTO RÁPIDO

**Si el problema está de vuelta:**

1. **Revisa primero:**
   - [SOLUCION_PERMANENTE_ESTADISTICAS.md](SOLUCION_PERMANENTE_ESTADISTICAS.md)
   - Sección "Señales de Alerta"

2. **Ejecuta test:**
   ```bash
   bash test-statistics.sh
   ```

3. **Revisa logs en Vercel:**
   - Busca "Failed to fetch"
   - Busca "Field not found"

4. **Si todo falla:**
   - Deshacer último cambio en estadísticas
   - Verificar que campo `answer` NO está en select
   - Redeploy

---

## 📈 HISTÓRICO

| Fecha | Problema | Causa | Solución | Status |
|-------|----------|-------|----------|--------|
| 13 Ene | GET /api/statistics → 500 | Campo `answer` en select | Remover field, agregar fallback | ✅ Fixed |
| 14 Ene | Documentación insuficiente | Poco contexto del problema | Crear SOLUCION_PERMANENTE.md | ✅ Done |
| 14 Ene | Sin validación automática | Manual checks only | Crear test-statistics.sh | ✅ Done |

---

**Última verificación:** ✅ 14 Ene 2026 00:25 - TODO FUNCIONANDO
