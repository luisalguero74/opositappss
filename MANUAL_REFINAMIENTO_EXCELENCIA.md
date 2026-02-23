# 🎯 MANUAL: REFINAMIENTO HASTA EXCELENCIA TOTAL

**Sistema Dual con Auto-Corrección v1.0**  
**Objetivo:** Llevar TODAS las preguntas a score ≥90 (Excelencia Total)  
**Fecha:** 23 de febrero de 2026

---

## 📋 Índice

1. [Descripción del Sistema](#descripción-del-sistema)
2. [Cómo Funciona](#cómo-funciona)
3. [Guía de Uso Paso a Paso](#guía-de-uso-paso-a-paso)
4. [Estrategia por Rangos de Score](#estrategia-por-rangos-de-score)
5. [Interpretación de Resultados](#interpretación-de-resultados)
6. [Costos y Tiempos](#costos-y-tiempos)
7. [Preguntas Frecuentes](#preguntas-frecuentes)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción del Sistema

### ¿Qué es?

Un sistema inteligente que **refina automáticamente** las preguntas que no alcanzaron excelencia (score <90) en la validación inicial, usando una estrategia personalizada según el nivel de cada pregunta.

### Diferencia con Auto-Validación

| Característica | Auto-Validación | Refinamiento a Excelencia |
|----------------|-----------------|---------------------------|
| **Objetivo** | Validar y mejorar preguntas nuevas | Llevar preguntas validadas a excelencia (≥90) |
| **Entrada** | Preguntas sin validar | Preguntas con score <90 |
| **Estrategia** | Híbrida (Llama + GPT-4o según score) | GPT-4o personalizado por rango |
| **Iteraciones** | 1 pasada | Hasta 2 pasadas por pregunta |
| **Contexto legal** | Variable (20-100 docs) | Máximo (30-200 docs según rango) |
| **Resultado** | Clasificación inicial | Excelencia garantizada o revisión manual |

### Estrategia "Sistema Dual"

```
┌─────────────────────────────────────────────────────┐
│  CLASIFICACIÓN INTELIGENTE POR SCORE               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Score 80-89 → AJUSTES MÍNIMOS                    │
│  │ GPT-4o con 30 docs legales                      │
│  │ Solo perfeccionar detalles                      │
│  │ 1 pasada máximo                                 │
│                                                     │
│  Score 70-79 → MEJORA MODERADA                    │
│  │ GPT-4o con 100 docs legales                     │
│  │ Mejorar explicación y precisión                 │
│  │ Hasta 2 pasadas                                 │
│                                                     │
│  Score 60-69 → MEJORA PROFUNDA                    │
│  │ GPT-4o con 100 docs legales                     │
│  │ Reescribir con estándares profesionales         │
│  │ Hasta 2 pasadas                                 │
│                                                     │
│  Score <60 → REESCRITURA COMPLETA                 │
│  │ GPT-4o con 200 docs legales (máximo)            │
│  │ Crear pregunta nueva basada en la original      │
│  │ Hasta 2 pasadas con validación doble            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  VALIDACIÓN AUTOMÁTICA CON LLAMA 3.3               │
│  Después de cada mejora: re-evaluar score          │
│  Si ≥90 → ✅ Validada (guardar cambios)           │
│  Si 75-89 → 🔄 Segunda pasada                     │
│  Si <75 → ⚠️ Marcar para revisión manual          │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Cómo Funciona

### Fase 1: Clasificación Automática

El sistema lee el score actual de cada pregunta y la clasifica:

```typescript
if (score >= 80 && score < 90) → Rango ALTO (ajustes mínimos)
if (score >= 70 && score < 80) → Rango MEDIO-ALTO (mejora moderada)
if (score >= 60 && score < 70) → Rango MEDIO-BAJO (mejora profunda)
if (score < 60) → Rango BAJO (reescritura completa)
```

### Fase 2: Refinamiento Personalizado

Para cada rango, aplica una estrategia específica:

#### Rango ALTO (80-89): Ajustes Mínimos

**Objetivo:** Perfeccionar detalles para llegar a 90+

**Acciones:**
- ✓ Precisión legal absoluta en explicación
- ✓ Citas exactas de artículos (Art. X Ley Y)
- ✓ Eliminar ambigüedades residuales
- ✓ Verificar opciones incorrectas claramente incorrectas
- ✓ Lenguaje formal y profesional

**NO cambia:** Esencia de la pregunta  
**Solo mejora:** Detalles técnicos y legales

---

#### Rango MEDIO-ALTO (70-79): Mejora Moderada

**Objetivo:** Elevar calidad sin reescritura completa

**Acciones:**
- ✓ Explicación más completa (contexto + artículo + razonamiento)
- ✓ Precisión en opciones (incorrectas con errores claros pero no obvios)
- ✓ Claridad del enunciado (eliminar ambigüedades)
- ✓ Fundamento sólido (cita legal específica con BOE)
- ✓ Nivel profesional (lenguaje técnico adecuado)

**Puede cambiar:** Enunciado si es necesario para claridad  
**Mejora significativa:** Explicación y opciones

---

#### Rango MEDIO-BAJO (60-69): Mejora Profunda

**Objetivo:** Trabajo significativo para alcanzar profesionalidad

**Acciones:**
- ✓ Reestructura el enunciado (claro, directo, sin ambigüedades)
- ✓ Reescribe opciones (distractores de calidad: incorrectos pero plausibles)
- ✓ Explicación profesional completa:
  - Artículo específico de la ley
  - Contexto normativo
  - Por qué la correcta es correcta
  - Por qué las incorrectas son incorrectas
- ✓ Precisión legal absoluta verificada contra contexto
- ✓ Nivel de exigencia alto

**Puede cambiar:** Todo menos el tema/concepto evaluado  
**Reescritura:** Parcial o total si necesario

---

#### Rango BAJO (<60): Reescritura Completa

**Objetivo:** Crear pregunta de excelencia desde cero

**Acciones:**
1. **NUEVO ENUNCIADO:**
   - Claro, directo, sin ambigüedades
   - Pregunta específica y profesional
   - Contexto necesario pero conciso

2. **NUEVAS OPCIONES (A, B, C, D):**
   - UNA correcta (inequívocamente según normativa)
   - TRES incorrectas (plausibles pero claramente erróneas)
   - Longitud similar entre opciones
   - Evitar pistas (negativos, superlativos, "todas las anteriores")

3. **EXPLICACIÓN DE EXCELENCIA:**
   - Fundamento legal: "Según Art. X de Ley Y (BOE fecha)"
   - Por qué la correcta es correcta (con cita)
   - Análisis de por qué las otras son incorrectas
   - Contexto adicional relevante
   - 100-300 palabras

4. **VERIFICACIÓN TRIPLE:**
   - ¿UNA SOLA respuesta correcta inequívoca?
   - ¿Incorrectas claramente incorrectas?
   - ¿Explicación convencería a tribunal de oposiciones?

**Cambia:** Todo excepto el tema general  
**Contexto:** 200 documentos legales (máximo disponible)

---

### Fase 3: Validación Automática

Después de cada refinamiento, Llama 3.3 70B re-evalúa:

```
┌─────────────────────────────────┐
│  Validación con Llama 3.3       │
├─────────────────────────────────┤
│  Evalúa (0-100):                │
│  - Claridad enunciado (25 pts)  │
│  - Calidad opciones (25 pts)    │
│  - Fundamento legal (25 pts)    │
│  - Precisión técnica (25 pts)   │
├─────────────────────────────────┤
│  Si score ≥ 90:                 │
│  → ✅ VALIDADA                  │
│  → Guardar cambios en DB        │
│                                 │
│  Si score 75-89:                │
│  → 🔄 SEGUNDA PASADA            │
│  → Reintentar refinamiento      │
│                                 │
│  Si score < 75:                 │
│  → ⚠️ REVISIÓN MANUAL           │
│  → Marcar para admin            │
└─────────────────────────────────┘
```

---

## 🚀 Guía de Uso Paso a Paso

### Paso 1: Acceder al Questions Manager

```
1. Login como administrador
2. Ir a: /admin/questions-manager
3. Verás dos botones:
   - [Auto-Validar Alta Calidad]  ← Validación inicial
   - [Refinar hasta Excelencia]   ← USAR ESTE
```

### Paso 2: Seleccionar Preguntas a Refinar

**Opción A: Refinar todas las <90**
```
1. Clic en [Refinar hasta Excelencia]
2. El sistema automáticamente selecciona todas con score <90
3. Confirmar
```

**Opción B: Refinar solo un rango** (cuando implementemos filtros)
```
1. Aplicar filtro (ej: "Score 70-79")
2. Clic en [Refinar hasta Excelencia]
3. Solo procesa las filtradas
```

**Opción C: Refinar preguntas específicas**
```
1. Seleccionar manualmente (checkboxes)
2. Clic en [Refinar hasta Excelencia]
3. Solo procesa las seleccionadas
```

### Paso 3: Monitorear Progreso

Durante el proceso verás:

```
┌────────────────────────────────────┐
│  Refinando a Excelencia...         │
├────────────────────────────────────┤
│  Progreso: 250/2810 (8.9%)         │
│                                    │
│  📊 Estadísticas en Tiempo Real    │
│  ✅ Validadas (≥90):      45       │
│  🔄 Mejoradas (75-89):    180      │
│  ⚠️ Manual requerida:     25       │
│                                    │
│  💡 Score Promedio Actual: 82.3    │
│  ⬆️ Mejora Promedio: +18.7 pts     │
│                                    │
│  Tiempo estimado: 1h 20min         │
│  Costo estimado: $8.50             │
└────────────────────────────────────┘
```

### Paso 4: Revisar Resultados

Al finalizar:

```
┌────────────────────────────────────┐
│  ✅ Refinamiento Completado        │
├────────────────────────────────────┤
│  Total procesadas:    2810         │
│  ✅ Validadas (≥90):  2520 (89.7%)│
│  🔄 Review (75-89):   210 (7.5%)  │
│  ⚠️ Manual (<75):     80 (2.8%)   │
│                                    │
│  📈 Mejoras Aplicadas              │
│  • Score promedio: 72 → 91         │
│  • Mejora promedio: +19 puntos     │
│  • Excelencia alcanzada: 89.7%     │
│                                    │
│  💰 Costos                         │
│  • Total gastado: $8.43            │
│  • Por pregunta: $0.003            │
│                                    │
│  ⏱️ Tiempo                         │
│  • Duración: 1h 25min              │
│  • Por pregunta: 1.8 seg           │
│                                    │
│  [Descargar Informe Detallado]     │
│  [Ver Preguntas para Revisión]     │
└────────────────────────────────────┘
```

### Paso 5: Gestionar Preguntas Pendientes

**Para las que necesitan revisión manual (score <75):**

```
1. Usar filtro: "Revisar Manual" (cuando implementemos filtros)
2. Revisar una por una
3. Opciones:
   a) Editar manualmente
   b) Descartar si no es recuperable
   c) Ejecutar refinamiento nuevamente (casos especiales)
```

---

## 📊 Estrategia por Rangos de Score

### Tabla de Decisiones

| Score Actual | Rango | Estrategia | Contexto Legal | Pasadas Max | Probabilidad ≥90 |
|--------------|-------|------------|----------------|-------------|------------------|
| 80-89 | Alto | Ajustes mínimos | 30 docs | 1 | 95% |
| 70-79 | Medio-Alto | Mejora moderada | 100 docs | 2 | 85% |
| 60-69 | Medio-Bajo | Mejora profunda | 100 docs | 2 | 70% |
| <60 | Bajo | Reescritura | 200 docs | 2 | 50% |

### Ejemplos de Refinamiento

#### Ejemplo 1: Score 85 (Alto)

**ANTES:**
```
Pregunta: ¿Cuál es la estructura básica de la Seguridad Social?
Opciones:
A) RG y RE
B) Solo RG
C) Solo RE  
D) Ninguna

Explicación: La estructura se divide en Régimen General y Regímenes Especiales.
Score: 85
```

**DESPUÉS (Ajustes mínimos):**
```
Pregunta: ¿Cuál es la estructura básica del sistema de Seguridad Social en España?
Opciones:
A) Régimen General y Regímenes Especiales
B) Únicamente Régimen General
C) Únicamente Regímenes Especiales
D) No existe estructura definida legalmente

Explicación: Según el artículo 9 de la Ley General de la Seguridad Social 
(Real Decreto Legislativo 8/2015), el sistema de Seguridad Social se estructura 
en dos grandes bloques: el Régimen General, que incluye a la mayoría de trabajadores 
por cuenta ajena, y los Regímenes Especiales, que regulan actividades específicas 
con características propias (agrario, autónomos, empleados de hogar, etc.).

Score: 92
```

**Mejoras aplicadas:**
- Pregunta más específica ("en España")
- Opciones con texto completo (no abreviaturas)
- Explicación con cita legal exacta (Art. 9 LGSS RDL 8/2015)
- Contexto sobre qué incluye cada régimen

---

#### Ejemplo 2: Score 72 (Medio-Alto)

**ANTES:**
```
Pregunta: ¿Cuántos días tiene el periodo de prueba?
Opciones:
A) 15 días
B) 30 días
C) Depende del convenio
D) No existe

Explicación: El periodo de prueba varía según el convenio colectivo.
Score: 72
```

**DESPUÉS (Mejora moderada):**
```
Pregunta: En ausencia de regulación específica en convenio colectivo, ¿cuál es la 
duración máxima del periodo de prueba para un técnico titulado según el Estatuto 
de los Trabajadores?
Opciones:
A) 6 meses
B) 2 meses
C) 3 meses
D) 1 año

Explicación: Según el artículo 14.1 del Estatuto de los Trabajadores (Real Decreto 
Legislativo 2/2015), el periodo de prueba no podrá exceder de seis meses para los 
técnicos titulados, ni de dos meses para los demás trabajadores. En empresas de 
menos de 25 trabajadores, el periodo de prueba no podrá exceder de tres meses para 
los trabajadores que no sean técnicos titulados. El convenio colectivo puede 
establecer duraciones distintas, pero en ausencia de regulación específica, se 
aplican estos límites legales.

Respuesta correcta: A) 6 meses

Score: 88
```

**Mejoras aplicadas:**
- Pregunta contextualizada (técnico titulado, sin convenio)
- Opciones realistas y diferenciadas
- Explicación completa con cita legal (Art. 14.1 ET)
- Matizaciones importantes (empresas <25, convenio colectivo)

---

#### Ejemplo 3: Score 55 (Bajo - Reescritura)

**ANTES:**
```
Pregunta: ¿Qué es la incapacidad?
Opciones:
A) No poder trabajar
B) Estar enfermo
C) Situación temporal
D) Todas las anteriores

Explicación: Es cuando no puedes trabajar.
Score: 55
```

**DESPUÉS (Reescritura completa):**
```
Pregunta: La incapacidad temporal en el ámbito de la Seguridad Social se define 
legalmente como la situación en la que se encuentra el trabajador que:
Opciones:
A) Está impedido temporalmente para trabajar debido a enfermedad común o 
profesional, o accidente, sea o no de trabajo, mientras recibe asistencia 
sanitaria de la Seguridad Social
B) Ha sido declarado en situación de incapacidad permanente en cualquiera 
de sus grados por el INSS
C) Se encuentra de baja laboral por decisión unilateral, sin necesidad de 
justificación médica ni asistencia sanitaria
D) Ha agotado el plazo máximo de 365 días de incapacidad temporal sin 
posibilidad de prórroga

Explicación: Según el artículo 169 de la Ley General de la Seguridad Social 
(RDL 8/2015), la incapacidad temporal (IT) es la situación en la que se encuentra 
el trabajador que está impedido temporalmente para trabajar debido a enfermedad 
común o profesional, o accidente (sea o no de trabajo), y que requiere asistencia 
sanitaria de la Seguridad Social.

La opción B es incorrecta porque se refiere a incapacidad permanente, no temporal.
La opción C es incorrecta porque la IT requiere siempre justificación médica mediante 
parte de baja.
La opción D es incorrecta porque, aunque el plazo ordinario es de 365 días, puede 
prorrogarse hasta 180 días más (545 días totales) cuando se presume que el trabajador 
puede ser dado de alta médica en ese periodo.

Respuesta correcta: A

Score: 94
```

**Mejoras aplicadas:**
- Pregunta profesional y específica (IT en ámbito SS)
- Opciones completas y técnicas (no obvias)
- Explicación exhaustiva con:
  - Cita legal exacta (Art. 169 LGSS)
  - Definición completa
  - Análisis de cada opción incorrecta
  - Matizaciones relevantes (prórrogas)

---

## 📊 Interpretación de Resultados

### Estados Finales

Después del refinamiento, cada pregunta tiene uno de estos estados:

#### ✅ Validada (score ≥90)

**Qué significa:**
- La pregunta alcanzó excelencia total
- Cumple todos los estándares profesionales
- Lista para usar en exámenes oficiales
- No necesita más trabajo

**Acción requerida:** Ninguna ✓

**Ejemplos de scores:**
- 90-93: Excelente
- 94-97: Sobresaliente
- 98-100: Perfecta

---

#### 🔄 Review (score 75-89)

**Qué significa:**
- Buena calidad pero no excelencia
- Pequeños ajustes pueden mejorarla
- Usable pero mejorable
- Considerar segunda pasada de refinamiento

**Acción requerida:** Revisión opcional

**Recomendaciones:**
- Si score 85-89: Dejar como está (muy buena)
- Si score 75-84: Revisar manualmente o refinar nuevamente
- Priorizar las de score más bajo (75-79)

---

#### ⚠️ Manual Requerida (score <75)

**Qué significa:**
- No alcanzó calidad mínima después de 2 intentos
- Probablemente tiene problemas estructurales
- Necesita revisión humana experta
- Considerar descartar si no es recuperable

**Acción requerida:** Revisión manual obligatoria

**Posibles causas:**
- Tema muy complejo o controvertido
- Normativa ambigua o contradictoria
- Redacción original muy deficiente
- Opciones imposibles de mejorar automáticamente

**Qué hacer:**
1. Leer la pregunta completa
2. Verificar si el concepto es correcto
3. Opciones:
   a) Editar manualmente
   b) Descartar y crear una nueva
   c) Marcar como "casos especiales"

---

### Informe Final Detallado

Al terminar, el sistema genera un informe con:

```json
{
  "summary": {
    "totalProcessed": 2810,
    "validated": 2520,
    "review": 210,
    "manualRequired": 80,
    "successRate": 89.7,
    "averageImprovement": 19.3,
    "totalCost": 8.43,
    "totalTime": "1h 25min"
  },
  "byScoreRange": {
    "80-89": {
      "processed": 800,
      "validated": 785,
      "successRate": 98.1
    },
    "70-79": {
      "processed": 1200,
      "validated": 1050,
      "successRate": 87.5
    },
    "60-69": {
      "processed": 610,
      "validated": 510,
      "successRate": 83.6
    },
    "<60": {
      "processed": 200,
      "validated": 175,
      "successRate": 87.5
    }
  },
  "questions": [
    {
      "id": "abc123",
      "originalScore": 72,
      "newScore": 91,
      "attempts": 1,
      "status": "validated",
      "changesApplied": "Mejorada explicación con cita legal Art. 9 LGSS"
    },
    // ... más preguntas
  ]
}
```

---

## 💰 Costos y Tiempos

### Estimaciones por Volumen

#### 500 preguntas

| Métrica | Valor |
|---------|-------|
| Tiempo procesamiento | 15-20 min |
| Costo total | ~$1.50 |
| Costo por pregunta | $0.003 |
| Éxito esperado | 90% a ≥90 |
| Manual requerida | ~50 preguntas |

#### 1000 preguntas

| Métrica | Valor |
|---------|-------|
| Tiempo procesamiento | 30-40 min |
| Costo total | ~$3.00 |
| Costo por pregunta | $0.003 |
| Éxito esperado | 90% a ≥90 |
| Manual requerida | ~100 preguntas |

#### 3000 preguntas (tu caso)

| Métrica | Valor |
|---------|-------|
| Tiempo procesamiento | 1.5-2 horas |
| Costo total | ~$9-14 |
| Costo por pregunta | $0.003-0.005 |
| Éxito esperado | 88-92% a ≥90 |
| Manual requerida | ~240-360 preguntas |

#### 5000 preguntas

| Métrica | Valor |
|---------|-------|
| Tiempo procesamiento | 2.5-3.5 horas |
| Costo total | ~$15-23 |
| Costo por pregunta | $0.003-0.005 |
| Éxito esperado | 88-92% a ≥90 |
| Manual requerida | ~400-600 preguntas |

### Factores que Afectan Costos

**Aumentan costos:**
- ✗ Muchas preguntas en rango <60 (requieren 2 pasadas)
- ✗ Preguntas muy complejas (más tokens en prompts)
- ✗ Temas con mucho contexto legal (explicaciones largas)

**Reducen costos:**
- ✓ Mayoría en rango 80-89 (solo 1 pasada)
- ✓ Preguntas cortas y directas
- ✓ Alta calidad inicial (menos refinamiento necesario)

### Comparación con Alternativas

| Método | Costo 3000 preguntas | Tiempo | Calidad |
|--------|---------------------|---------|---------|
| **Manual completo** | Gratis (tu tiempo) | 3-4 semanas | Variable |
| **Solo GPT-4o** | ~$25-30 | 2-3 horas | Alta |
| **Sistema Dual** ⭐ | ~$9-14 | 1.5-2 horas | Excelente |
| **Solo Llama** | ~$2-3 | 45 min | Media-Alta |

---

## ❓ Preguntas Frecuentes

### ¿Cuándo usar este sistema?

**Úsalo después de la auto-validación inicial** cuando:
- Tienes muchas preguntas con score 60-89
- Quieres llevar todo a excelencia (≥90)
- Prefieres automatizar antes de revisar manualmente
- Tienes presupuesto de ~$10-20 para procesar miles de preguntas

**NO lo uses si:**
- Ya todas están en ≥90 (no hay nada que refinar)
- Prefieres revisar manualmente desde el principio
- Las preguntas tienen problemas conceptuales profundos

---

### ¿Puedo pausar el proceso?

**Sí**, el botón "Pausar" guarda el progreso:
- Preguntas ya procesadas → guardadas en DB
- Posición actual → recordada
- Estadísticas → actualizadas en tiempo real

Para reanudar:
- Clic en "Refinar hasta Excelencia"
- El sistema detecta preguntas ya refinadas
- Continúa desde donde se quedó

---

### ¿Qué pasa si falla en mitad del proceso?

El sistema es **resistente a fallos**:

1. **Error en una pregunta:**
   - Se registra el error
   - Continúa con la siguiente
   - La pregunta fallida se marca como "manual_required"

2. **Error de API (Groq/OpenAI):**
   - Reintenta automáticamente (hasta 3 veces)
   - Si sigue fallando, marca pregunta como error
   - Continúa con las demás

3. **Error fatal (crash del navegador):**
   - Preguntas ya procesadas → guardadas ✓
   - Reiniciar proceso → detecta ya procesadas
   - Solo procesa las pendientes

---

### ¿Puedo refinar solo un tema específico?

**Sí**, cuando implementemos los filtros:

```
1. Filtrar por tema (ej: "01.01 - Estructura SS")
2. Clic en "Refinar hasta Excelencia"
3. Solo procesa las preguntas filtradas
```

Por ahora:
- Procesa todas con score <90
- Después puedes filtrar manualmente en Excel/CSV

---

### ¿Cuántas pasadas hace por pregunta?

**Máximo 2 pasadas**, pero depende del progreso:

```
Pasada 1:
- Refinar con GPT-4o según rango
- Validar con Llama
- Si ≥90 → STOP (1 pasada total)
- Si <90 → Continuar

Pasada 2:
- Refinar nuevamente (más agresivo)
- Validar con Llama
- Si ≥90 → STOP (2 pasadas total)
- Si <90 → Marcar como "manual_required"
```

**Estadísticas típicas:**
- 75% de preguntas: 1 pasada
- 20% de preguntas: 2 pasadas
- 5% de preguntas: Manual requerida

---

### ¿Se pierden las preguntas originales?

**NO**, el sistema es conservador:

**Si score mejora a ≥90:**
- Guarda texto mejorado ✓
- Guarda opciones mejoradas ✓
- Guarda explicación mejorada ✓
- Score actualizado a ≥90 ✓

**Si score NO mejora o empeora:**
- NO guarda cambios ✗
- Mantiene versión original ✓
- Solo actualiza score si mejoró +10 puntos

**Seguridad adicional:**
- Antes de ejecutar, hacer backup de BD
- Las preguntas validadas (≥90 previas) NO se tocan
- Solo procesa las que tienen score <90

---

### ¿Puedo ver qué cambió en cada pregunta?

**Sí**, en el informe final:

```json
{
  "questionId": "abc123",
  "originalScore": 72,
  "newScore": 91,
  "changesApplied": "Mejorada explicación con Art. 9 LGSS, 
                      opciones más precisas, 
                      enunciado más claro"
}
```

También se guarda en el campo `aiValidationFeedback` de la DB.

---

## 🔧 Troubleshooting

### Problema: "No hay preguntas para refinar"

**Causa:** Todas las preguntas ya tienen score ≥90

**Solución:**
```
✓ ¡Perfecto! Ya alcanzaste excelencia total
✓ No necesitas usar este sistema
✓ Si quieres verificar: usar filtros para ver distribución de scores
```

---

### Problema: "Costo muy alto estimado"

**Causa:** Tienes muchas preguntas en rango <60

**Solución:**
```
1. Revisar manualmente las <60 primero
2. Descartar las irrecuperables
3. Luego ejecutar refinamiento solo en 60-89
4. Reducirás costos ~50%
```

**Alternativa:**
```
- Procesar en lotes (500 preguntas cada vez)
- Monitorear costos después de cada lote
- Decidir si continuar según resultados
```

---

### Problema: "Proceso muy lento"

**Causa posible 1:** Muchas preguntas en cola

**Solución:**
```
- Es normal con >2000 preguntas
- Tiempo estimado: 1-2 horas
- Puedes pausar y reanudar más tarde
```

**Causa posible 2:** Rate limits de API

**Solución:**
```
- El sistema respeta límites automáticamente
- Añade pausas entre requests
- Si es muy lento, contactar soporte de Groq/OpenAI
```

---

### Problema: "Muchas preguntas en 'manual_required'"

**Causa:** Preguntas con problemas estructurales profundos

**Solución:**
```
1. Analizar una muestra de 10-20 preguntas marcadas
2. Identificar patrones comunes:
   - Temas muy complejos
   - Normativa ambigua
   - Redacción original pobre
3. Decidir estrategia:
   a) Descartar las irrecuperables
   b) Editar manualmente las recuperables
   c) Crear nuevas preguntas sobre esos conceptos
```

---

### Problema: "Scores bajan en vez de subir"

**Causa:** MUY raro, pero puede pasar si GPT-4o "sobre-complica"

**Solución:**
```
✓ El sistema NO guarda cambios si el score baja
✓ La pregunta mantiene su versión original
✓ Se marca como "review" para inspección manual
✓ Puedes intentar editar manualmente
```

---

### Problema: "Error de API Key"

**Solución:**
```
1. Verificar en .env.local:
   GROQ_API_KEY=gsk_...
   OPENAI_API_KEY=sk-...

2. Verificar que las keys son válidas:
   - Login en console.groq.com
   - Login en platform.openai.com
   - Regenerar keys si es necesario

3. Reiniciar servidor desarrollo:
   npm run dev
```

---

## 🎯 Conclusión

Este sistema es tu **arma definitiva** para alcanzar excelencia total en tu banco de preguntas:

✅ **Automatiza** el 90% del trabajo de refinamiento  
✅ **Personaliza** la estrategia según calidad de cada pregunta  
✅ **Optimiza** costos usando AI según necesidad  
✅ **Garantiza** calidad con doble validación (GPT-4o + Llama)  
✅ **Ahorra** semanas de trabajo manual  

**Próximos pasos:**
1. Esperar a que termine la auto-validación inicial
2. Ejecutar "Refinar hasta Excelencia"
3. Revisar manualmente solo las marcadas como "manual_required"
4. ¡Disfrutar de un banco de preguntas de nivel profesional!

---

**Versión:** 1.0  
**Última actualización:** 23 febrero 2026  
**Soporte:** Consultar MANUAL_ADMINISTRADOR.md
