# 📄 FORMATO ESTÁNDAR DE PREGUNTAS - OpositApp

## Estructura de Base de Datos

```typescript
interface Question {
  id: string                    // UUID generado automáticamente
  text: string                  // Enunciado de la pregunta (obligatorio)
  options: string               // JSON string con array de opciones ["a", "b", "c", "d"]
  correctAnswer: string         // Letra mayúscula: "A", "B", "C", "D"
  explanation: string | null    // Motivación legal con referencias
  temaCodigo: string | null     // Código del tema: "01.01", "02.03", etc.
  temaNumero: number | null     // Número de tema: 1, 2, 3, etc.
  temaParte: string | null      // "GENERAL" o "ESPECÍFICO"
  temaTitulo: string | null     // Título del tema
  difficulty: string | null     // "facil", "media", "dificil"
  reviewStatus: string          // "PENDING", "VALIDATED", "QUARANTINED"
  aiReviewed: boolean | null    // Si fue revisada por IA
  questionnaireId: string       // ID del banco/cuestionario
}
```

## Formatos de Importación Soportados

### 1. JSON (Recomendado)

```json
{
  "questions": [
    {
      "text": "¿Cuál es la estructura del Sistema de la Seguridad Social en España?",
      "options": [
        "Régimen General y Regímenes Especiales",
        "Solo Régimen General",
        "Solo Régimen de Autónomos",
        "Ninguna de las anteriores"
      ],
      "correctAnswer": "A",
      "explanation": "Según el artículo 9 del texto refundido de la Ley General de la Seguridad Social, aprobado por Real Decreto Legislativo 8/2015, de 30 de octubre: \"El Sistema de la Seguridad Social, configurado por la acción protectora en sus modalidades contributiva y no contributiva, estará integrado por el Régimen General y por los Regímenes Especiales establecidos o que se establezcan en el futuro\". Por tanto, la opción correcta es la A. Las opciones B y C son incorrectas porque excluyen componentes esenciales del sistema. La opción D es claramente falsa.",
      "temaCodigo": "01.01",
      "temaNumero": 1,
      "temaParte": "GENERAL",
      "temaTitulo": "Estructura del Sistema de Seguridad Social",
      "difficulty": "media"
    }
  ]
}
```

**Variantes aceptadas:**
- `question` en vez de `text`
- `respuestaCorrecta` en vez de `correctAnswer`
- `opciones` en vez de `options`
- `explicacion` en vez de `explanation`
- `dificultad` en vez de `difficulty`

### 2. JSON Compacto

```json
[
  {
    "text": "Pregunta...",
    "options": ["a", "b", "c", "d"],
    "correctAnswer": "A",
    "explanation": "Motivación..."
  }
]
```

### 3. TXT Estructurado

```
PREGUNTA 1:
¿Cuál es la estructura del Sistema de la Seguridad Social en España?

OPCIONES:
a) Régimen General y Regímenes Especiales
b) Solo Régimen General
c) Solo Régimen de Autónomos
d) Ninguna de las anteriores

RESPUESTA CORRECTA: A

EXPLICACIÓN:
Según el artículo 9 del texto refundido de la Ley General de la Seguridad Social, aprobado por Real Decreto Legislativo 8/2015, de 30 de octubre: "El Sistema de la Seguridad Social, configurado por la acción protectora en sus modalidades contributiva y no contributiva, estará integrado por el Régimen General y por los Regímenes Especiales establecidos o que se establezcan en el futuro". 

Por tanto, la opción correcta es la A. Las opciones B y C son incorrectas porque excluyen componentes esenciales del sistema. La opción D es claramente falsa.

TEMA: 01.01
PARTE: GENERAL
TÍTULO: Estructura del Sistema de Seguridad Social
DIFICULTAD: media

---

PREGUNTA 2:
...
```

**Variantes permitidas:**
- Separadores: `---`, `===`, `***`, `===PREGUNTA===`
- Headers: `PREGUNTA X:`, `QUESTION:`, `P-X:`, `X.`
- Opciones: `a)`, `A)`, `a.`, `A.`, `(a)`, `[a]`
- Respuesta: `RESPUESTA:`, `CORRECTA:`, `ANSWER:`, `CORRECT:`

### 4. TXT Simple (Menos estructurado)

```
1. ¿Pregunta aquí?

a) Opción A
b) Opción B
c) Opción C  
d) Opción D

Correcta: A

Explicación: Texto legal...

---

2. ¿Siguiente pregunta?
...
```

### 5. PDF Extraído

El sistema automáticamente:
1. Extrae texto del PDF
2. Identifica bloques de preguntas
3. Parsea según patrones conocidos
4. Corrige errores comunes

### 6. WORD (.doc, .docx)

Similar a PDF:
1. Extrae contenido textual
2. Preserva formato de listas
3. Identifica estructura
4. Parsea preguntas

### 7. EPUB

Para libros de preguntas:
1. Extrae capítulos/secciones
2. Identifica preguntas por tema
3. Parsea estructura HTML interna

---

## Reglas de Normalización

### Respuesta Correcta

**Input aceptado:** `a`, `A`, `0`, `1`, `opción a`, `La a)`, etc.

**Output normalizado:** `A`, `B`, `C`, `D`

**Conversiones automáticas:**
```
0 → A
1 → B
2 → C
3 → D

a, A, (a), [a], a), a. → A
b, B, (b), [b], b), b. → B
...
```

### Opciones

**Input aceptado:**
```json
// Array simple
["texto a", "texto b", "texto c", "texto d"]

// JSON string
"{\"a\": \"texto\", \"b\": \"texto\", ...}"

// String multi-línea
"a) texto\nb) texto\nc) texto\nd) texto"
```

**Output normalizado:** JSON string
```json
"[\"texto a\", \"texto b\", \"texto c\", \"texto d\"]"
```

### Tema

**Input aceptado:**
- `"1.1"` → `"01.01"`
- `"01-01"` → `"01.01"`
- `"Tema 1"` → `"01.00"`
- `"T01"` → `"01.00"`

### Parte

**Input aceptado:**
- `"gen"`, `"general"`, `"GENERAL"`, `"GEN"` → `"GENERAL"`
- `"esp"`, `"especifico"`, `"ESPECÍFICO"` → `"ESPECÍFICO"`

### Dificultad

**Input aceptado:**
- `"easy"`, `"fácil"`, `"facil"` → `"facil"`
- `"medium"`, `"media"`, `"normal"` → `"media"`
- `"hard"`, `"difícil"`, `"dificil"` → `"dificil"`

---

## Validaciones Automáticas

### Obligatorias (Error si falta)
- ✅ `text` - Mínimo 20 caracteres
- ✅ `options` - Exactamente 4 opciones
- ✅ `correctAnswer` - Letra A-D válida

### Recomendadas (Warning si falta)
- ⚠️ `explanation` - Debe incluir referencias legales
- ⚠️ `temaCodigo` - Para clasificación
- ⚠️ `difficulty` - Para balanceo

### Validaciones de Calidad
- ✓ Opciones no duplicadas
- ✓ Opciones equilibradas en longitud
- ✓ Respuesta correcta presente en opciones
- ✓ Explicación > 50 caracteres
- ✓ Explicación contiene: artículo, ley, decreto, o similar
- ✓ No hay caracteres especiales raros

---

## Correcciones Automáticas

### Nivel 1: Básicas (Siempre aplicadas)
```typescript
// Eliminar caracteres nulos
text.replace(/\u0000/g, '')

// Normalizar espacios
text.replace(/\s+/g, ' ').trim()

// Eliminar BOM
text.replace(/^\uFEFF/, '')

// Corregir comillas
text.replace(/[""]/g, '"')
text.replace(/['']/g, "'")
```

### Nivel 2: Estructura (Si autoCorrect=true)
```typescript
// Normalizar respuesta correcta
"a" → "A"
"0" → "A"
"opción a" → "A"

// Corregir formato opciones
"a) texto\nb) texto" → ["texto", "texto", ...]

// Extraer número de tema
"Tema 1" → temaNumero: 1
```

### Nivel 3: Semántica (Si autoCorrect=true)
```typescript
// Añadir letras a opciones si faltan
["texto1", "texto2"] → ["a) texto1", "b) texto2"]

// Detectar respuesta por contexto
"La correcta es la opción b" → correctAnswer: "B"

// Inferir dificultad
Si explanation > 200 chars → "dificil"
```

---

## Errores Comunes y Soluciones

| Error | Causa | Solución Automática |
|-------|-------|---------------------|
| "Respuesta correcta inválida" | `correctAnswer: "a"` | Convertir a `"A"` |
| "Opciones mal formateadas" | String en vez de array | Parsear y convertir |
| "Falta campo obligatorio" | Campo vacío | Rellenar con valor por defecto |
| "Caracteres no válidos" | Encoding incorrecto | Limpiar y normalizar |
| "Opciones duplicadas" | Copy-paste error | Detectar y avisar |
| "Explicación muy corta" | < 20 chars | Marcar para revisión |

---

## Ejemplos de Calidad

### ✅ EXCELENTE (Puntuación: 95-100)

```json
{
  "text": "Según el artículo 42.1 del Estatuto de los Trabajadores, ¿cuál es el plazo máximo de duración del período de prueba para técnicos titulados?",
  "options": [
    "6 meses, salvo que se establezca otra duración por convenio colectivo",
    "3 meses en cualquier caso",
    "2 meses, prorrogables a 4 por convenio",
    "1 año si así lo establece el contrato individual"
  ],
  "correctAnswer": "A",
  "explanation": "El artículo 42.1 del Estatuto de los Trabajadores (Real Decreto Legislativo 2/2015, de 23 de octubre) establece: \"El período de prueba no podrá exceder de seis meses para los técnicos titulados, ni de dos meses para los demás trabajadores\", añadiendo que \"salvo que se disponga otra cosa en convenio colectivo\". Por tanto, la opción A es correcta al recoger ambos elementos: el plazo de 6 meses y la posibilidad de variación por convenio. La opción B es incorrecta porque establece un plazo rígido sin contemplar el convenio. La C inventa plazos no previstos legalmente. La D es falsa porque el contrato individual no puede establecer un período superior al legal.",
  "temaCodigo": "05.02",
  "temaNumero": 5,
  "temaParte": "ESPECÍFICO",
  "temaTitulo": "Contrato de trabajo y período de prueba",
  "difficulty": "media"
}
```

### ⚠️ ACEPTABLE (Puntuación: 70-85)

```json
{
  "text": "¿Cuántos meses dura el período de prueba para técnicos?",
  "options": [
    "6 meses",
    "3 meses",
    "2 meses",
    "12 meses"
  ],
  "correctAnswer": "A",
  "explanation": "Según el ET, son 6 meses para técnicos titulados.",
  "difficulty": "facil"
}
```

**Problemas:**
- Pregunta poco específica
- No cita artículo exacto
- Explicación muy breve
- Falta tema

### ❌ INSUFICIENTE (Puntuación: <70)

```json
{
  "text": "Período de prueba?",
  "options": ["6m", "3m", "2m", "12m"],
  "correctAnswer": "A",
  "explanation": "6 meses"
}
```

**Problemas críticos:**
- Pregunta incompleta
- Opciones abreviadas
- Sin referencias legales
- Sin contexto

---

## Plantilla Recomendada

```json
{
  "questions": [
    {
      "text": "[Pregunta completa y específica con contexto legal]",
      "options": [
        "[Opción A - debe ser clara y completa]",
        "[Opción B - distractor plausible]",
        "[Opción C - distractor plausible]",
        "[Opción D - distractor plausible]"
      ],
      "correctAnswer": "A",
      "explanation": "Según el artículo [X] de la [Ley/Decreto Y], de [fecha]: \"[Texto literal]\". [Explicación de por qué A es correcta]. [Razón por la que B, C, D son incorrectas].",
      "temaCodigo": "XX.YY",
      "temaNumero": XX,
      "temaParte": "GENERAL|ESPECÍFICO",
      "temaTitulo": "[Título del tema]",
      "difficulty": "facil|media|dificil"
    }
  ]
}
```

---

## Checklist de Calidad

Antes de importar, verifica:

- [ ] Todas las preguntas tienen enunciado claro
- [ ] Hay exactamente 4 opciones por pregunta
- [ ] La respuesta correcta es A, B, C o D
- [ ] La respuesta correcta existe en las opciones
- [ ] La explicación cita al menos un artículo/ley
- [ ] La explicación justifica por qué las incorrectas lo son
- [ ] No hay opciones duplicadas
- [ ] Las opciones son de longitud similar
- [ ] El tema está correctamente codificado
- [ ] La dificultad es apropiada

---

**Actualizado:** 23 de febrero de 2026  
**Versión:** 2.0
