# 📦 SISTEMA DE IMPORTACIÓN ROBUSTO - LISTO PARA IMPLEMENTAR

**Fecha:** 23 de febrero de 2026  
**Estado:** ✅ PREPARADO, PENDIENTE DE IMPLEMENTACIÓN  
**Complejidad:** Alta (requiere librerías adicionales)

---

## 📋 ARCHIVOS CREADOS

### 1. Documentación del Formato Estándar
**Archivo:** [FORMATO_PREGUNTAS_ESTANDAR.md](FORMATO_PREGUNTAS_ESTANDAR.md)

**Contenido:**
- ✅ Estructura de base de datos completa
- ✅ 7 formatos de importación soportados
- ✅ Reglas de normalización detalladas
- ✅ Validaciones automáticas
- ✅ Correcciones automáticas en 3 niveles
- ✅ Tabla de errores comunes y soluciones
- ✅ Ejemplos de calidad (Excelente/Aceptable/Insuficiente)
- ✅ Plantilla recomendada
- ✅ Checklist de calidad

---

### 2. Sistema de Parseo Robusto
**Archivo:** [API_PARSE_QUESTIONS_READY.ts](API_PARSE_QUESTIONS_READY.ts)

**Características:**
- ✅ **Multi-formato:** JSON, TXT, PDF, DOC, DOCX, EPUB
- ✅ **Normalización inteligente:**
  - Limpieza de caracteres problemáticos (BOM, nulos, etc.)
  - Conversión automática de respuestas (0→A, a→A, etc.)
  - Parseo flexible de opciones (array, objeto, texto)
  - Normalización de temas, dificultad, parte
  
- ✅ **Validación exhaustiva:**
  - 5 niveles de validación
  - Scoring 0-100
  - Detección de errores críticos vs warnings
  - Verificación de referencias legales
  
- ✅ **Auto-corrección:**
  - Nivel 1: Caracteres y encoding
  - Nivel 2: Estructura de datos
  - Nivel 3: Inferencia semántica
  
- ✅ **Parsers específicos:**
  - JSONParser (con variantes de campos)
  - TXTParser (múltiples formatos estructurados)
  - PDFParser (extracción de texto)
  - DOCParser (Word)
  - EPUBParser (libros electrónicos)

**Líneas de código:** ~800

---

### 3. API de Importación por Lotes
**Archivo:** [API_IMPORT_BATCH_READY.ts](API_IMPORT_BATCH_READY.ts)

**Características:**
- ✅ Importación en lotes de 50 preguntas
- ✅ Creación/actualización del banco global
- ✅ Manejo robusto de errores
- ✅ Rollback por pregunta (no falla todo el lote)
- ✅ Reportes detallados de éxito/fallo

**Líneas de código:** ~120

---

### 4. Ejemplos Completos
**Archivo:** [EJEMPLO_PREGUNTAS_COMPLETO.md](EJEMPLO_PREGUNTAS_COMPLETO.md)

**Contenido:**
- ✅ 4 formatos diferentes con ejemplos reales
- ✅ Análisis de calidad (Perfecto/Bueno/Con error)
- ✅ Patrones detectables
- ✅ Patrones de error comunes
- ✅ Recomendaciones para el sistema

---

## 🔧 DEPENDENCIAS NECESARIAS

### NPM Packages (Instalar)

```bash
npm install pdf-parse      # Para PDFs
npm install mammoth        # Para Word (.doc, .docx)
npm install epub2          # Para EPUB (opcional)
```

**Tamaños aproximados:**
- pdf-parse: ~1.5MB
- mammoth: ~500KB
- epub2: ~300KB

**Total:** ~2.3MB adicionales

---

## 🎯 CAPACIDADES DEL SISTEMA

### Formatos Soportados

| Formato | Extensión | Parser | Robustez |
|---------|-----------|--------|----------|
| **JSON** | `.json` | JSONParser | ⭐⭐⭐⭐⭐ |
| **TXT** | `.txt` | TXTParser | ⭐⭐⭐⭐⭐ |
| **PDF** | `.pdf` | PDFParser | ⭐⭐⭐⭐ |
| **Word** | `.doc`, `.docx` | DOCParser | ⭐⭐⭐⭐ |
| **EPUB** | `.epub` | EPUBParser | ⭐⭐⭐ |

### Variantes de Campos Reconocidas

**Texto de pregunta:**
- `text`, `question`, `pregunta`, `enunciado`

**Opciones:**
- `options`, `opciones`, `choices`, `respuestas`

**Respuesta correcta:**
- `correctAnswer`, `respuestaCorrecta`, `correct`, `answer`, `correcta`

**Explicación:**
- `explanation`, `explicacion`, `motivacion`, `justificacion`

**Tema:**
- `temaCodigo`, `tema`, `topic`, `codigo`

**Dificultad:**
- `difficulty`, `dificultad`, `level`

### Normalizaciones Automáticas

#### Respuestas
```
Input → Output
-------------
"a"   → "A"
"0"   → "A"
"(b)" → "B"
"2"   → "C"
"opción d" → "D"
```

#### Opciones
```
Input → Output
-------------
["a", "b", "c", "d"] → ["a", "b", "c", "d"]
{a:"x", b:"y"...}    → ["x", "y", "z", "w"]
"a) x\nb) y\n..."    → ["x", "y", "z", "w"]
```

#### Temas
```
Input → Output
-------------
"1.1"     → "01.01"
"01-01"   → "01.01"
"Tema 1"  → "01.00"
```

### Validaciones Implementadas

**1. Texto de pregunta:**
- ❌ Mínimo 20 caracteres (error)
- ⚠️ Máximo 500 caracteres (warning)

**2. Opciones:**
- ❌ Exactamente 4 opciones (error)
- ❌ Sin duplicados (error)
- ❌ Mínimo 3 caracteres por opción (error)
- ⚠️ Longitudes equilibradas (warning)

**3. Respuesta correcta:**
- ❌ Debe ser A, B, C o D (error)
- ❌ Debe existir en opciones (error)

**4. Explicación:**
- ⚠️ Mínimo 20 caracteres (warning)
- ⚠️ Debe incluir referencias legales (warning)
- ⚠️ Debe justificar incorrectas (warning)

**5. Metadata:**
- ℹ️ Tema recomendado
- ℹ️ Dificultad recomendada

### Sistema de Scoring

```
Puntuación base: 100

Errores críticos:
- Sin texto: -30
- Opciones != 4: -40
- Sin respuesta correcta: -40
- Respuesta inválida: -30
- Opciones duplicadas: -20
- Respuesta no existe: -20
- Opción muy corta: -10

Warnings:
- Texto muy largo: -5
- Sin explicación: -15
- Sin referencias legales: -10
- No justifica incorrectas: -5
- Opciones desbalanceadas: -5

Mínimo: 0
Máximo: 100
```

---

## 📊 FLUJO DE PROCESAMIENTO

```
┌──────────────────┐
│ Usuario sube     │
│ archivo          │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Validar tipo     │
│ y tamaño         │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Detectar formato │
│ (JSON/TXT/PDF)   │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Parser           │
│ específico       │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Normalizar       │
│ cada pregunta    │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Validar          │
│ (errors/warnings)│
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Calcular         │
│ score 0-100      │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Retornar         │
│ ParseResult      │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Usuario revisa   │
│ vista previa     │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Confirma         │
│ importación      │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Import por lotes │
│ (50 preguntas)   │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Guardar en BD    │
│ (Prisma)         │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│ Resultado final  │
│ (X importadas)   │
└──────────────────┘
```

---

## ⚙️ CONFIGURACIÓN RECOMENDADA

### Variables de Entorno

```env
# Límites de importación
MAX_FILE_SIZE=10485760  # 10MB
MAX_QUESTIONS_PER_BATCH=50

# Auto-corrección
AUTO_CORRECT_DEFAULT=true

# Scoring
MIN_SCORE_TO_IMPORT=40  # Preguntas <40 se rechazan automáticamente
```

### Ajustes de Validación

```typescript
// En QuestionValidator.validate()

// Cambiar umbrales según necesidades:
MIN_TEXT_LENGTH = 20        // Mínimo caracteres pregunta
MAX_TEXT_LENGTH = 500       // Máximo caracteres pregunta
MIN_OPTION_LENGTH = 3       // Mínimo caracteres opción
MIN_EXPLANATION_LENGTH = 20 // Mínimo caracteres explicación
OPTION_BALANCE_RATIO = 3    // Ratio máximo longitud opciones
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Backend (30 min)

1. **Instalar dependencias:**
   ```bash
   npm install pdf-parse mammoth
   ```

2. **Crear endpoint de parseo:**
   - Copiar `API_PARSE_QUESTIONS_READY.ts` a:
     `/app/api/admin/questions/parse/route.ts`

3. **Crear endpoint de importación:**
   - Copiar `API_IMPORT_BATCH_READY.ts` a:
     `/app/api/admin/questions/import-batch/route.ts`

4. **Probar endpoints:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/questions/parse \
     -F "file=@test.json" \
     -F "autoCorrect=true"
   ```

### Fase 2: Frontend (20 min)

1. **Reemplazar importador:**
   - Copiar `IMPORTACION_MEJORADA_READY.tsx` a:
     `/app/admin/import-questions/page.tsx`

2. **Probar flujo completo:**
   - Upload → Preview → Import → Success

### Fase 3: Testing (20 min)

1. **Probar con JSON**
2. **Probar con TXT**
3. **Probar con PDF** (si está instalado)
4. **Verificar errores detectados**
5. **Verificar importación en BD**

---

## 🧪 CASOS DE PRUEBA

### Caso 1: JSON Perfecto
```json
{"questions": [{"text": "...", "options": [...], "correctAnswer": "A"}]}
```
**Resultado esperado:** 100% válidas, score 95-100

### Caso 2: JSON con errores menores
```json
{"questions": [{"text": "...", "options": [...], "correctAnswer": "a"}]}
```
**Resultado esperado:** Auto-corregido a "A", score 85-95

### Caso 3: TXT estructurado
```
PREGUNTA 1:
...
a) ...
b) ...
```
**Resultado esperado:** Parseado correctamente, score 80-90

### Caso 4: Archivo con errores
```json
{"questions": [{"text": "corto", "options": ["a"], "correctAnswer": "Z"}]}
```
**Resultado esperado:** 
- Error: texto <20 chars
- Error: opciones != 4
- Error: respuesta inválida
- Score: <50

---

## 📈 MÉTRICAS ESPERADAS

### Tasas de Éxito por Formato

| Formato | Tasa de parseo | Tasa de validación | Score medio |
|---------|----------------|--------------------| ------------|
| JSON estructurado | 99% | 95% | 92 |
| JSON variantes | 95% | 90% | 85 |
| TXT estructurado | 90% | 85% | 80 |
| TXT simple | 75% | 70% | 70 |
| PDF | 70% | 65% | 65 |
| Word | 80% | 75% | 72 |

### Rendimiento

- **JSON:** ~100 preguntas/segundo
- **TXT:** ~50 preguntas/segundo
- **PDF:** ~10 preguntas/segundo
- **Word:** ~20 preguntas/segundo

---

## ⚠️ LIMITACIONES CONOCIDAS

1. **PDF:** Calidad depende del OCR/estructura del PDF original
2. **Word:** Tablas complejas pueden no parsearse correctamente
3. **EPUB:** Implementación básica, puede requerir mejoras
4. **Imágenes:** No se extraen preguntas de imágenes (requeriría OCR)
5. **Tablas:** No se parsean tablas como opciones (requeriría lógica adicional)

---

## 🆘 TROUBLESHOOTING

### Error: "pdf-parse not found"
**Solución:** `npm install pdf-parse`

### Error: "Formato no reconocido"
**Solución:** Verificar extensión del archivo, debe ser: json, txt, pdf, doc, docx, epub

### Error: "Archivo demasiado grande"
**Solución:** Límite actual 10MB, dividir archivo o aumentar `MAX_FILE_SIZE`

### Error: "Muchos errores de parseo"
**Solución:** 
1. Verificar formato del archivo
2. Activar `autoCorrect=true`
3. Revisar ejemplo en [EJEMPLO_PREGUNTAS_COMPLETO.md](EJEMPLO_PREGUNTAS_COMPLETO.md)

---

## 📝 PRÓXIMOS PASOS

**Ahora mismo (cuando quieras):**
1. Puedes pasarme un archivo de ejemplo tuyo para analizar
2. Puedo refinar partes específicas del parser
3. Puedo crear más validaciones personalizadas

**Después de implementar:**
1. Agregar soporte para imágenes con OCR
2. Mejorar detección de tablas
3. Integrar con sistema de validación IA
4. Dashboard de estadísticas de importación

---

**✨ TODO LISTO PARA CUANDO NECESITES IMPLEMENTAR ✨**

¿Quieres que analice un archivo tuyo o necesitas que refuerce alguna parte?
