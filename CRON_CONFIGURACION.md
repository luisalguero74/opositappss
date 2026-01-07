# ⏰ Configuración de Cron Jobs - Generación Automática

## ✅ Estado: CONFIGURADO Y LISTO

El sistema de generación automática de preguntas está completamente configurado.

---

## 📋 Configuración Actual

### 1. Endpoint API
- **URL:** `/api/cron/generate-questions`
- **Método:** GET
- **Autenticación:** Bearer token con `CRON_SECRET`

### 2. Schedule (Vercel Cron)
- **Frecuencia:** Todos los días a las 3:00 AM UTC
- **Configurado en:** `vercel.json`

### 3. Variables de Entorno
- ✅ `CRON_SECRET`: Configurada en Vercel
- ✅ `GROQ_API_KEY`: Configurada en Vercel
- ✅ `DATABASE_URL`: Configurada en Vercel

---

## 🎯 Qué hace el Cron Job

**Cada noche a las 3 AM:**

1. **Analiza estadísticas** de preguntas por tema
2. **Selecciona 5 temas** con menos preguntas (< 100 preguntas)
3. **Genera 10 preguntas** por cada tema seleccionado
4. **Crea cuestionarios** no publicados con las preguntas generadas
5. **Registra el proceso** en logs de Vercel

**Objetivo:** Llegar a tener 100 preguntas por cada tema de forma automática.

---

## 🔍 Cómo verificar que funciona

### Opción 1: Probar manualmente
```bash
# Obtener el CRON_SECRET
npx vercel env pull .env.local

# Probar el endpoint localmente
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://opositappss.vercel.app/api/cron/generate-questions
```

### Opción 2: Ver logs en Vercel
1. Ve a: https://vercel.com/luisalguero74s-projects/opositappss
2. Click en "Deployments"
3. Click en el deployment activo
4. Click en "Functions"
5. Busca `/api/cron/generate-questions`

### Opción 3: Revisar la base de datos
```sql
-- Ver cuestionarios creados por cron
SELECT * FROM "Questionnaire" 
WHERE title LIKE '%Cron%' 
ORDER BY "createdAt" DESC;

-- Ver preguntas por tema
SELECT "temaCodigo", COUNT(*) as total
FROM "Question"
GROUP BY "temaCodigo"
ORDER BY total ASC;
```

---

## ⚙️ Configuración Detallada

### vercel.json
```json
{
  "crons": [{
    "path": "/api/cron/generate-questions",
    "schedule": "0 3 * * *"
  }]
}
```

**Schedule explicado:**
- `0 3 * * *` = Todos los días a las 3:00 AM UTC
- Puedes cambiar a:
  - `0 2 * * *` = 2:00 AM
  - `0 */6 * * *` = Cada 6 horas
  - `0 0 * * 0` = Cada domingo a medianoche

### Límites por ejecución
- **Máximo 5 temas** por ejecución
- **10 preguntas** por tema
- **Duración máxima:** 5 minutos (300 segundos)
- **50 preguntas totales** por día (máximo)

---

## 🛡️ Seguridad

1. **Autenticación obligatoria**
   - Solo Vercel puede ejecutar el cron (token secreto)
   - No hay UI pública para activarlo

2. **Protección contra duplicados**
   - Solo genera si el tema tiene < 100 preguntas
   - Prioriza temas con menos contenido

3. **Manejo de errores**
   - Reintentos automáticos en llamadas a Groq
   - Logs completos en caso de fallo

---

## 🧪 Prueba Manual (para verificar)

Para ejecutar una prueba manual ahora mismo:

```bash
# Desde tu terminal
cd /Users/copiadorasalguero/opositapp

# Obtener el secreto
CRON_SECRET=$(npx vercel env pull .env.local 2>/dev/null && grep CRON_SECRET .env.local | cut -d '=' -f2)

# Probar el endpoint
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://opositappss.vercel.app/api/cron/generate-questions
```

Deberías recibir una respuesta JSON con:
```json
{
  "success": true,
  "totalPreguntas": 50,
  "temasProcesados": 5,
  "detalles": [...]
}
```

---

## 📊 Monitoreo

### En Vercel Dashboard:
- **Cron Jobs:** https://vercel.com/luisalguero74s-projects/opositappss/settings/crons
- **Logs:** Ver cada ejecución automática
- **Historial:** Últimas 10 ejecuciones

### En la aplicación:
- Ve a: `/admin/questions-review`
- Filtra por "Cron" en el título
- Verás los cuestionarios generados automáticamente

---

## 🔄 Próxima ejecución

**Mañana a las 3:00 AM UTC** (4:00 AM CET en horario de invierno)

Si quieres cambiar el horario, edita `vercel.json` y redespliega.

---

## ✅ Checklist de verificación

- [x] Endpoint creado en `/api/cron/generate-questions`
- [x] `vercel.json` configurado con schedule
- [x] `CRON_SECRET` configurada en Vercel
- [x] `GROQ_API_KEY` disponible
- [x] Lógica de generación implementada
- [x] Sistema de fetch directo (no SDK)
- [x] Manejo de errores robusto

**Todo listo. El cron se ejecutará automáticamente cada noche.**
