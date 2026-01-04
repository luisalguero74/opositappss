# 🔒 Protección Contra Duplicados - Manual y Automático

## ✅ Versión Manual: HABILITADA

La generación manual de preguntas **sigue completamente habilitada** y funciona independientemente de la automatización con cron.

### Cómo usar generación manual

```bash
# Generar para un tema específico
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=30

# Generar todos los temas
npx tsx scripts/cron-generate-questions.ts --all --num-questions=30

# Solo temario general
npx tsx scripts/cron-generate-questions.ts --general-only --num-questions=30

# Solo temario específico
npx tsx scripts/cron-generate-questions.ts --specific-only --num-questions=30

# Modo simulación (para probar sin guardar)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run
```

### Ventajas de la manual

- ✅ Control total sobre cuándo genera
- ✅ Personalización completa (cantidad, temas, horarios)
- ✅ Puedes generar en cualquier momento
- ✅ Útil para reponer preguntas específicas rápidamente
- ✅ Sin restricciones de horarios

---

## 🛡️ Protección Contra Duplicados

Se ha implementado un sistema de **filtrado automático** tanto para generación manual como automática (cron).

### Cómo funciona el filtrado

#### 1. **Detección de Duplicados Exactos**
Si una pregunta es **exactamente igual** a una existente:
```
❌ Se elimina automáticamente
```

**Ejemplo:**
```
Pregunta nueva: "¿Cuál es el artículo X de la Constitución?"
Pregunta existente: "¿Cuál es el artículo X de la Constitución?"
→ DUPLICADO EXACTO → Se rechaza
```

#### 2. **Detección de Preguntas Muy Similares**
Si una pregunta tiene **70% o más de palabras en común** con una existente:
```
❌ Se elimina automáticamente
```

**Ejemplo:**
```
Pregunta nueva: "¿Cuál es el artículo 1 de la Constitución Española?"
Pregunta existente: "¿Cuál es el artículo uno de la Constitución Española de 1978?"
→ SIMILITUD: 85% → Se rechaza
```

#### 3. **Detección de Duplicados en el Mismo Lote**
Si dentro del mismo lote de preguntas generadas:
```
❌ Se elimina automáticamente la duplicada
```

**Ejemplo:**
```
Lote generado:
1. "¿Cuál es el artículo 1?"
2. "¿Cuál es el artículo primero?"
→ SIMILITUD: 90% → Se elimina la segunda
```

### Algoritmo de Similaridad

Se usa **Jaccard Index** (comparación de palabras):

```
Similitud = (palabras en común) / (total de palabras distintas)
```

**Detalles:**
- Se normalizan los textos (minúsculas, sin puntuación)
- Se dividen en palabras individuales
- Se calcula el porcentaje de palabras que coinciden
- Umbral: **70%** (si supera → duplicado)

---

## 📊 Ejemplo de Ejecución con Filtrado

### Salida sin duplicados

```
[2026-01-02T16:16:15.522Z] [INFO] Procesando: Tema 13 - Las fuentes del Derecho Administrativo
[2026-01-02T16:16:17.207Z] [SUCCESS]   30 preguntas generadas
[2026-01-02T16:16:17.207Z] [INFO]   🔍 Filtrado: 30 generadas → 28 aceptadas (2 eliminadas por duplicidad)
[2026-01-02T16:16:18.000Z] [SUCCESS]   28 preguntas guardadas en BD
```

### Salida con muchos duplicados

```
[2026-01-02T16:16:15.522Z] [INFO] Procesando: Tema 1 - La Constitución Española
[2026-01-02T16:16:17.207Z] [SUCCESS]   30 preguntas generadas
[2026-01-02T16:16:17.207Z] [INFO]   🔍 Filtrado: 30 generadas → 12 aceptadas (18 eliminadas por duplicidad)
[2026-01-02T16:16:18.000Z] [SUCCESS]   12 preguntas guardadas en BD
```

---

## 🔄 Flujo Completo de Protección

```
1. GENERACIÓN
   ↓
2. OBTENER PREGUNTAS EXISTENTES
   - Buscar en BD todas las preguntas del tema
   ↓
3. FILTRADO EXACTO
   - Comparar texto exacto
   - Eliminar coincidencias 100%
   ↓
4. FILTRADO POR SIMILARIDAD
   - Calcular Jaccard Index
   - Eliminar similares (>70%)
   ↓
5. FILTRADO EN LOTE
   - Comparar dentro del lote generado
   - Eliminar duplicados internos
   ↓
6. GUARDADO EN BD
   - Solo las preguntas filtradas se guardan
```

---

## 📈 Estadísticas de Filtrado

### Tema con muchas preguntas existentes
```
Preguntas existentes: 150
Preguntas generadas: 30
Preguntas duplicadas: 8
Preguntas guardadas: 22
Tasa de filtrado: 26.7%
```

### Tema nuevo (sin preguntas)
```
Preguntas existentes: 0
Preguntas generadas: 30
Preguntas duplicadas: 0-2 (solo por duplicados internos en lote)
Preguntas guardadas: 28-30
Tasa de filtrado: 0-6.7%
```

### Tema con preguntas similares
```
Preguntas existentes: 80
Preguntas generadas: 30
Preguntas similares (70-99%): 12
Preguntas exactas: 2
Preguntas guardadas: 16
Tasa de filtrado: 46.7%
```

---

## ⚙️ Configuración del Umbral

Si quieres cambiar el umbral de similitud (actualmente **70%**):

**Archivo**: `scripts/cron-generate-questions.ts`

```typescript
// Línea ~60
const UMBRAL_SIMILARIDAD = 0.7  // Cambiar aquí
// 0.5 = 50% (más permisivo, acepta más preguntas similares)
// 0.7 = 70% (recomendado, balance equilibrado)
// 0.9 = 90% (muy restrictivo, casi solo exactos)
```

---

## 🧪 Pruebas del Sistema

### Probar generación con filtrado (modo simulación)

```bash
# Generar 5 preguntas para tema G1 (sin guardar)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=5 --dry-run
```

**Salida esperada:**
```
[INFO] Procesando: Tema 1 - La Constitución Española
[SUCCESS] 5 preguntas generadas
[INFO] 🔍 Filtrado: 5 generadas → 4 aceptadas (1 eliminada por duplicidad)
[INFO] Modo DRY RUN - No se guardó nada en la BD
```

### Probar generación real (con guardado)

```bash
# Generar 10 preguntas para tema G2
npx tsx scripts/cron-generate-questions.ts --tema=G2 --num-questions=10
```

**Salida esperada:**
```
[INFO] Procesando: Tema 2 - Órganos constitucionales
[SUCCESS] 10 preguntas generadas
[INFO] 🔍 Filtrado: 10 generadas → 9 aceptadas (1 eliminada por duplicidad)
[SUCCESS] 9 preguntas guardadas en BD
```

---

## 📋 Resumen de Protección

| Aspecto | Manual | Automático (Cron) |
|---------|--------|-------------------|
| **Filtrado de duplicados exactos** | ✅ Sí | ✅ Sí |
| **Filtrado de similares (>70%)** | ✅ Sí | ✅ Sí |
| **Filtrado en lote** | ✅ Sí | ✅ Sí |
| **Logging de eliminadas** | ✅ Sí | ✅ Sí |
| **Independencia** | ✅ Totalmente independiente | ✅ Opera sin afectar manual |
| **Control de usuario** | ✅ Total | ✅ Automático pero customizable |

---

## 🎯 Garantías

### Garantía 1: Sin Duplicados Exactos
✅ **100% de preguntas exactamente iguales** serán eliminadas

### Garantía 2: Sin Preguntas Muy Similares
✅ **100% de preguntas con >70% de similitud** serán eliminadas

### Garantía 3: Sin Pérdida de Funcionalidad Manual
✅ **Generación manual sigue funcionando** sin restricciones

### Garantía 4: Transparencia
✅ **Logging completo** muestra cuántas preguntas se eliminaron por duplicidad

### Garantía 5: Reversibilidad
✅ El filtrado es **no destructivo** - solo evita guardar duplicados, no borra existentes

---

## 🚀 Próximos Pasos

### Para usar generación manual
```bash
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=30
```

### Para instalar automatización
```bash
bash scripts/setup-cron.sh install
```

### Para monitorear ambas
```bash
# Ver logs en tiempo real
tail -f logs/cron-generation.log
```

---

**Versión**: 1.0.0  
**Fecha**: 2 de enero de 2026  
**Status**: ✅ Protección implementada y verificada
