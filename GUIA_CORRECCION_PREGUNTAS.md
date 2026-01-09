# 🎯 Guía de Corrección de Preguntas Existentes

## 📅 Última actualización: 9 de enero de 2026

---

## 🎯 Objetivo

Esta guía te ayudará a **mejorar la precisión de las respuestas** de las preguntas existentes en la base de datos usando el sistema automatizado de corrección con IA.

---

## ✅ Sistema Implementado

Ya existe un **sistema completo** para revisar y corregir preguntas:

- **Panel de Administración**: `/admin/questions-quality`
- **API de Revisión**: `/api/admin/review-questions`
- **Validador Automático**: Analiza cada pregunta y asigna una puntuación 0-100
- **Regeneración con IA**: Corrige automáticamente explicaciones incorrectas

---

## 📋 Paso a Paso para Corregir Preguntas

### 1. Acceder al Panel de Calidad

1. Abre tu navegador y ve a: **https://tu-dominio.com/admin/questions-quality**
   - En desarrollo: `http://localhost:3000/admin/questions-quality`
   - En producción: `https://opositapp.vercel.app/admin/questions-quality`

2. Debes estar autenticado como **administrador**

### 2. Analizar las Preguntas Existentes

1. **Configurar los filtros**:
   - **Preguntas a analizar**: 100-500 (recomendado empezar con 100)
   - **Puntuación mínima**: 0
   - **Puntuación máxima**: 59 (para ver solo las problemáticas)
   - ✅ Marcar "Solo mostrar preguntas con problemas"

2. **Clic en "🔍 Analizar Preguntas"**

3. **Esperar el análisis** (puede tardar 10-30 segundos)

### 3. Revisar las Estadísticas

El sistema mostrará:

```
📊 ESTADÍSTICAS GENERALES
========================
Total en BD:        1,245 preguntas
Válidas:           450 (36%)
Inválidas:         795 (64%)
Promedio:          52/100

DISTRIBUCIÓN:
🔴 Críticas (<40):   312
🟠 Malas (40-59):    483
🟡 Regulares (60-79): 200
🟢 Buenas (80+):     250
```

### 4. Identificar Problemas Comunes

Las preguntas con problemas suelen tener:

❌ **Explicación demasiado corta** (< 100 caracteres)
❌ **No incluye referencia legal** (sin Art., Ley, RDL, etc.)
❌ **No tiene cita textual** (sin texto entrecomillado)
❌ **No explica por qué las incorrectas están mal**
❌ **Opciones mal redactadas**

### 5. Seleccionar Preguntas para Corregir

**Opción A: Selección manual**
- Marca las casillas de las preguntas que quieres corregir
- Revisa cada pregunta individualmente

**Opción B: Selección automática**
- Clic en **"Seleccionar todas"** para corregir todas las problemáticas

**Recomendación**: Empieza con las preguntas **críticas** (<40 puntos)

### 6. Regenerar Explicaciones

1. Con las preguntas seleccionadas, clic en **"🔄 Regenerar Explicaciones"**

2. Confirma la acción (aparecerá un diálogo)

3. **El sistema automáticamente**:
   - Lee cada pregunta de la BD
   - Genera una nueva explicación con IA (usando Groq)
   - Aplica un prompt estricto con formato obligatorio
   - Valida que la nueva explicación sea correcta
   - Actualiza la pregunta en la base de datos

4. **Tiempo estimado**:
   - 10 preguntas: ~30-60 segundos
   - 50 preguntas: ~3-5 minutos
   - 100 preguntas: ~6-10 minutos

5. **Resultado**:
   ```
   ✅ Proceso completado:
   - Procesadas: 50
   - Exitosas: 48
   - Fallidas: 2
   ```

### 7. Verificar Resultados

1. Después de la regeneración, clic en **"🔍 Analizar Preguntas"** de nuevo

2. Deberías ver:
   - ✅ **Aumento en el porcentaje de válidas**
   - ✅ **Mejor puntuación promedio**
   - ✅ **Menos preguntas críticas**

---

## 🎯 Estrategia Recomendada para Corregir Toda la Base de Datos

### Fase 1: Preguntas Críticas (<40 puntos)

```bash
Filtros:
- Preguntas a analizar: 200
- Puntuación mínima: 0
- Puntuación máxima: 39
- Solo problemas: ✅
```

1. Analizar
2. Seleccionar todas
3. Regenerar explicaciones
4. Verificar resultados

### Fase 2: Preguntas Malas (40-59 puntos)

```bash
Filtros:
- Preguntas a analizar: 300
- Puntuación mínima: 40
- Puntuación máxima: 59
- Solo problemas: ✅
```

1. Analizar
2. Seleccionar todas
3. Regenerar explicaciones
4. Verificar resultados

### Fase 3: Preguntas Regulares (60-79 puntos)

```bash
Filtros:
- Preguntas a analizar: 300
- Puntuación mínima: 60
- Puntuación máxima: 79
- Solo problemas: ✅
```

1. Analizar
2. Revisar manualmente (estas son casi buenas)
3. Regenerar solo las que realmente lo necesiten

### Fase 4: Verificación Final

```bash
Filtros:
- Preguntas a analizar: 1000
- Puntuación mínima: 0
- Puntuación máxima: 100
- Solo problemas: ❌ (mostrar todas)
```

1. Analizar todo
2. Verificar estadísticas finales
3. Objetivo: **>80% válidas, promedio >75/100**

---

## 🔧 Opciones Avanzadas

### Eliminar Preguntas Irreparables

Si algunas preguntas son imposibles de corregir (p.ej., pregunta mal formulada desde el origen):

1. Selecciona las preguntas problemáticas
2. Clic en **"🗑️ Eliminar"**
3. ⚠️ **ATENCIÓN**: Esta acción NO se puede deshacer

**Solo usar para preguntas con errores de bulto en el enunciado mismo**

### Regeneración en Lotes Pequeños

Si tienes muchas preguntas (>500), es mejor procesarlas en lotes:

- Lote 1: 100 preguntas (puntuación 0-39)
- Lote 2: 100 preguntas (puntuación 0-39, offset 100)
- Lote 3: 100 preguntas (puntuación 0-39, offset 200)
- etc.

Usa el campo **"Offset"** para ir avanzando.

---

## 📊 Criterios de Validación

El sistema valida automáticamente cada pregunta con estos criterios:

### ✅ Explicación/Motivación (40 puntos)

- **Longitud mínima**: 100 caracteres
- **Referencia legal obligatoria**: Debe mencionar Art., Ley, RDL, etc.
- **Cita textual recomendada**: Texto entrecomillado del artículo
- **Explicar todas las opciones**: Por qué correcta es correcta Y por qué incorrectas están mal

### ✅ Opciones (30 puntos)

- **Exactamente 4 opciones**: A, B, C, D
- **Mínimo 5 caracteres cada una**
- **Longitudes equilibradas**: No muy diferentes entre sí
- **Sin duplicados**

### ✅ Pregunta (20 puntos)

- **Mínimo 20 caracteres**
- **Lenguaje formal legal**
- **Terminar con "?"**
- **Evitar negaciones** (preferible pregunta en positivo)

### ✅ Estructura (10 puntos)

- **respuestaCorrecta válida**: 0-3 (o A-D)
- **Sin errores de formato**

---

## 🎯 Ejemplo de Mejora

### ❌ ANTES (Puntuación: 35/100)

```
Pregunta: ¿Cuál es la edad de jubilación?

Opciones:
A) 65 años
B) 67 años
C) 70 años
D) Ninguna de las anteriores

Respuesta correcta: B

Explicación: La edad de jubilación es 67 años.
```

**Errores**:
- ❌ Explicación muy corta (40 caracteres)
- ❌ No incluye referencia legal
- ❌ No explica por qué las otras opciones están mal
- ❌ No tiene cita textual

---

### ✅ DESPUÉS (Puntuación: 88/100)

```
Pregunta: ¿Cuál es la edad ordinaria de jubilación según el RDL 8/2015?

Opciones:
A) 65 años con 38 años cotizados
B) 67 años
C) 70 años
D) 65 años en todos los casos

Respuesta correcta: B

Explicación: El artículo 205.1.a) del Real Decreto Legislativo 8/2015 
establece textualmente: "Tener cumplida la edad de sesenta y siete años". 
Por tanto, la opción B es correcta porque es la edad ordinaria establecida 
legalmente. La opción A es incorrecta porque aunque es posible jubilarse 
a los 65 años, requiere tener cotizados al menos 38 años y 6 meses, no 
siendo la edad ordinaria general. La opción C es incorrecta porque 70 años 
no es la edad de jubilación, sino que es posible trabajar hasta esa edad 
bajo ciertas condiciones. La opción D es incorrecta porque la edad de 
jubilación no siempre es 65 años.
```

**Mejoras**:
- ✅ Explicación completa (578 caracteres)
- ✅ Cita artículo específico (RDL 8/2015, Art. 205.1.a)
- ✅ Incluye cita textual entrecomillada
- ✅ Explica TODAS las opciones (correcta e incorrectas)
- ✅ Lenguaje formal y preciso

---

## 💡 Consejos y Buenas Prácticas

### 1. Empieza Poco a Poco

No intentes corregir 1,000 preguntas de golpe. Empieza con:
- Primera vez: 20-50 preguntas
- Verifica que funciona bien
- Incrementa gradualmente

### 2. Prioriza por Criticidad

Orden recomendado:
1. 🔴 Críticas (<40) - **URGENTE**
2. 🟠 Malas (40-59) - **IMPORTANTE**
3. 🟡 Regulares (60-79) - **MEJORAR**
4. 🟢 Buenas (80+) - **OPCIONAL**

### 3. Supervisa los Resultados

Después de cada lote de regeneración:
- Revisa manualmente 5-10 preguntas aleatorias
- Verifica que las explicaciones tienen sentido
- Confirma que las referencias legales son correctas

### 4. Ten Paciencia

El proceso de corrección puede ser largo:
- 1,000 preguntas: ~1-2 horas de procesamiento
- Es automático, puedes dejarlo correr
- El sistema procesa en lotes de 5-10 para evitar timeouts

### 5. Haz Backups

Antes de corregir toda la base de datos:

```bash
# Exportar preguntas actuales
node scripts/export-questions-local.mjs
```

Esto crea un archivo JSON con todas las preguntas por si necesitas revertir.

---

## 🐛 Resolución de Problemas

### Error: "No autorizado"

**Solución**: Asegúrate de estar autenticado como administrador
- Cierra sesión y vuelve a iniciar
- Verifica que tu usuario tenga role="admin" en la BD

### Error: "Timeout" o "504 Gateway Timeout"

**Solución**: Estás procesando demasiadas preguntas a la vez
- Reduce el número (p.ej., de 100 a 50)
- Procesa en lotes más pequeños

### Error: "API rate limit"

**Solución**: Has excedido el límite de la API de Groq
- Espera 1 minuto
- Reduce batchSize en el código si persiste
- Considera usar una API key de pago

### Las explicaciones regeneradas siguen siendo malas

**Posible causa**: El prompt de regeneración necesita ajustes
**Solución**: Edita `/app/api/admin/review-questions/route.ts`
- Busca la función `regenerarExplicacion()`
- Ajusta el prompt con más ejemplos específicos
- Reinicia el servidor de desarrollo

### Preguntas con puntuación 0

**Posible causa**: Error en el formato de la pregunta en BD
**Solución**: 
- Elimina esa pregunta (está corrupta)
- O corrígela manualmente en `/admin/questions`

---

## 📚 Archivos Relacionados

- **Panel Admin**: `/app/admin/questions-quality/page.tsx`
- **API**: `/app/api/admin/review-questions/route.ts`
- **Validador**: `/src/lib/validador-preguntas.ts`
- **Prompts Mejorados**: `/src/lib/prompts-mejorados.ts`
- **Documentación Sistema**: `SISTEMA_REVISION_PREGUNTAS.md`
- **Mejoras Implementadas**: `MEJORAS_IMPLEMENTADAS_CALIDAD.md`

---

## 🎯 Resultado Esperado

Después de completar todo el proceso:

```
📊 ESTADÍSTICAS FINALES
========================
Total en BD:        1,245 preguntas
✅ Válidas:        1,050 (84%)
❌ Inválidas:        195 (16%)
📈 Promedio:         78/100

DISTRIBUCIÓN:
🔴 Críticas (<40):    15
🟠 Malas (40-59):    180
🟡 Regulares (60-79): 300
🟢 Buenas (80+):     750
```

### Objetivos de Calidad:

- ✅ **>80% preguntas válidas** (puntuación ≥60)
- ✅ **Promedio >75/100**
- ✅ **<10% críticas** (puntuación <40)
- ✅ **100% con referencia legal**
- ✅ **>70% con cita textual**

---

## 🚀 Proceso Rápido (Resumen)

```bash
1. Ir a: /admin/questions-quality
2. Filtros: limit=100, maxScore=59, onlyProblems=✅
3. Clic: "Analizar Preguntas"
4. Clic: "Seleccionar todas"
5. Clic: "Regenerar Explicaciones"
6. Esperar confirmación
7. Verificar resultados
8. Repetir con siguiente lote
```

---

## ✉️ Soporte

Si encuentras problemas o necesitas ayuda:

1. Revisa los logs del servidor (consola de desarrollo)
2. Consulta `SISTEMA_REVISION_PREGUNTAS.md` para más detalles técnicos
3. Verifica que tienes la última versión del código

---

## 📝 Notas Finales

- ⏱️ **Tiempo estimado total**: 2-4 horas para revisar y corregir toda la BD
- 🤖 **Automatización**: El 90% del trabajo lo hace la IA
- 👁️ **Supervisión**: Revisa muestras aleatorias para garantizar calidad
- 🔄 **Iterativo**: Puedes repetir el proceso si es necesario
- 💾 **Seguro**: Haz backup antes de cambios masivos

---

**¡Buena suerte mejorando la calidad de tus preguntas!** 🎯
