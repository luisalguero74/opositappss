# 📖 Manual de Administrador - Sistema de Validación IA y Gestión de Preguntas

**Versión:** 2.0  
**Fecha:** 23 de febrero de 2026  
**Autor:** Sistema de IA OpositApp

---

## 📑 Índice

1. [Introducción](#introducción)
2. [Sistema de Validación IA Híbrido](#sistema-de-validación-ia-híbrido)
3. [Filtros Avanzados de Validación](#filtros-avanzados-de-validación)
4. [Importación Inteligente de Preguntas](#importación-inteligente-de-preguntas)
5. [Casos de Uso Comunes](#casos-de-uso-comunes)
6. [Resolución de Problemas](#resolución-de-problemas)
7. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Introducción

Este manual describe las funcionalidades avanzadas implementadas para la gestión profesional del banco de preguntas de OpositApp, incluyendo:

- ✨ **Validación IA Híbrida** (Llama 3.3 70B + GPT-4o)
- 🔍 **Filtros Avanzados** para búsqueda y clasificación
- 📥 **Importación Multi-formato** con validación automática

---

## 🤖 Sistema de Validación IA Híbrido

### ¿Qué es?

Un sistema de doble pasada que combina dos modelos de IA para garantizar excelencia profesional en las preguntas:

1. **Llama 3.3 70B** (Groq) - Validación rápida y económica
2. **GPT-4o** (OpenAI) - Refinamiento para preguntas complejas

### ¿Cómo funciona?

```
PREGUNTA PENDIENTE
       ↓
[PASADA 1: Llama 3.3 70B]
   - Valida contra 20 docs legales
   - Puntúa 0-100 en 4 criterios
   - Si score ≥ 80 → ✅ LISTO
       ↓ (si score < 80)
[PASADA 2: GPT-4o]
   - Validación PROFESIONAL
   - 100 documentos legales
   - Mejoras garantizadas
   - Excelencia total
       ↓
   RESULTADO FINAL
```

### Criterios de Evaluación

El sistema evalúa cada pregunta en **4 dimensiones**:

| Criterio | Peso | Qué evalúa |
|----------|------|------------|
| **Calidad de Pregunta** | 25% | Redacción, claridad, relevancia |
| **Calidad de Respuestas** | 25% | Corrección legal, distractores plausibles |
| **Calidad de Explicación** | 25% | Referencias legales, texto literal |
| **Precisión Legal** | 25% | Verificación contra normativa vigente |

**Puntuación Global = Promedio de los 4 criterios**

### Estados de Validación

| Estado | Puntuación | Descripción | Acción |
|--------|------------|-------------|--------|
| **VALIDATED** ✅ | ≥ 90 | Excelencia profesional | Publicable directamente |
| **NEEDS_REVIEW** ⚠️ | 75-89 | Buena calidad, revisar detalles | Revisión humana recomendada |
| **QUARANTINED** 🚫 | < 75 | Calidad insuficiente | Mejora manual obligatoria |

### Mejoras Automáticas

Cuando `puntuación ≥ 60` (threshold actual), el sistema aplica:

- ✏️ **Reescritura de pregunta** (si necesario)
- 📝 **Mejora de opciones** (claridad, precisión)
- 📚 **Enriquecimiento de explicación**:
  - Artículos exactos citados LITERALMENTE
  - Ley completa (nombre, número, año)
  - Justificación de opciones incorrectas

### Uso del Sistema

#### Paso 1: Acceder al Gestor de Preguntas

```
URL: https://opositapp.site/admin/questions-manager
```

#### Paso 2: Seleccionar Preguntas

1. Usa los filtros para encontrar preguntas pendientes
2. Selecciona las preguntas a validar (checkbox)
3. O haz clic en **"Seleccionar Todas Pendientes"**

#### Paso 3: Iniciar Validación

1. Clic en botón **"Auto-Validar Alta Calidad"**
2. Confirma el número de preguntas
3. El modal de progreso aparecerá automáticamente

#### Paso 4: Monitorizar Progreso

El modal muestra en tiempo real:

```
┌─────────────────────────────────────────┐
│  Validación IA en Progreso              │
│                                          │
│  ████████████████░░░░░░░░  67%          │
│                                          │
│  Procesadas: 140 / 210                   │
│  Validadas: 45  ⚠️ Revisar: 82           │
│  🚫 Cuarentena: 13  🔧 Mejoradas: 127    │
│                                          │
│  Tiempo estimado: 15 minutos             │
└─────────────────────────────────────────┘
```

#### Paso 5: Completar

Al finalizar:
- ✅ Todas las preguntas están clasificadas
- 📊 Las estadísticas se actualizan automáticamente
- 🔄 La página se refresca mostrando los nuevos estados

### Costes Estimados

| Escenario | Preguntas | Coste Llama | Coste GPT-4o | Total |
|-----------|-----------|-------------|--------------|-------|
| **Pequeño** | 100 | $0.20 | $0-0.40 | ~$0.30 |
| **Medio** | 1000 | $2.00 | $2-4 | ~$3.00 |
| **Grande** | 5000 | $10.00 | $10-20 | ~$15.00 |

💡 **Nota:** El coste GPT-4o varía según cuántas preguntas necesitan refinamiento (típicamente 30-40%).

### Configuración Avanzada

Para modificar el comportamiento del sistema, edita:

```typescript
// app/admin/questions-manager/page.tsx
const threshold = 60  // Umbral para aplicar mejoras

// app/api/admin/ai-validate-questions/route.ts
const useAdvancedModel = quickResult.scores.overall < 80  // Umbral para GPT-4o
```

---

## 🔍 Filtros Avanzados de Validación

### Ubicación

Panel principal del Gestor de Preguntas, sección superior.

### Filtros Disponibles

#### 1. Estado de Validación

| Opción | Muestra |
|--------|---------|
| **Todas** | Sin filtro |
| **✅ Validadas** | Solo preguntas con score ≥90 |
| **⚠️ Revisar** | Preguntas 75-89 revisadas por IA |
| **🚫 Cuarentena** | Preguntas <75 |
| **🔧 Mejoradas por IA** | Cualquier pregunta procesada por IA |
| **⏳ Sin revisar** | Preguntas no procesadas |

#### 2. Contador de Resultados

Muestra dinámicamente:
- Número de preguntas filtradas
- Total de preguntas en la base de datos

#### 3. Estadísticas Rápidas

Dashboard mini con:
- Validadas (total)
- Revisar (total)
- Cuarentena (total)
- Mejoradas (total)

### Uso Combinado de Filtros

Puedes combinar filtros para búsquedas específicas:

**Ejemplo 1:** Preguntas validadas del Tema 01
```
- Estado: ✅ Validadas
- Tema: 01.XX
```

**Ejemplo 2:** Preguntas difíciles en cuarentena
```
- Estado: 🚫 Cuarentena
- Dificultad: Difícil
```

### Exportación de Datos Filtrados

Después de aplicar filtros:

1. Clic en **"📥 Exportar Filtradas (X)"**
2. Se descarga archivo JSON con las preguntas
3. Nombre: `preguntas-{filtro}-{fecha}.json`

**Usos del archivo exportado:**
- Backup de preguntas específicas
- Análisis externo
- Re-importación tras edición manual
- Compartir con correctores

---

## 📥 Importación Inteligente de Preguntas

### Formatos Soportados

| Formato | Extensión | Notas |
|---------|-----------|-------|
| JSON | `.json` | Formato nativo, recomendado |
| Texto plano | `.txt` | Estructura definida |
| PDF | `.pdf` | Extracción automática |
| Word | `.doc`, `.docx` | Conversión automática |
| EPUB | `.epub` | Libros electrónicos |

### Proceso de Importación

#### 1. Preparación del Archivo

##### Opción A: Usar Plantilla JSON

Descarga la plantilla desde el importador:

```json
{
  "questions": [
    {
      "text": "¿Pregunta completa?",
      "options": {
        "a": "Opción A",
        "b": "Opción B",
        "c": "Opción C",
        "d": "Opción D"
      },
      "correctAnswer": "A",
      "explanation": "Art. XX de la Ley...",
      "tema": "01.01",
      "difficulty": "media"
    }
  ]
}
```

##### Opción B: Usar Plantilla TXT

```
PREGUNTA 1:
¿Cuál es la estructura de la Seguridad Social?

OPCIONES:
a) Régimen General y Especiales
b) Solo General
c) Solo Autónomos
d) Ninguna

RESPUESTA CORRECTA: A

EXPLICACIÓN:
Según el Art. 9 del RDL 8/2015...

TEMA: 01.01
DIFICULTAD: media

---

PREGUNTA 2:
...
```

#### 2. Acceder al Importador

```
URL: https://opositapp.site/admin/import-questions
```

#### 3. Configurar Opciones

Antes de seleccionar archivo:

| Opción | Recomendado | Qué hace |
|--------|-------------|----------|
| **🔧 Corrección automática** | ✅ Sí | Corrige respuestas mal formateadas, espacios, etc. |
| **⏭️ Saltar errores** | ❌ No | Omite preguntas con errores en vez de fallar todo |
| **🏦 Importar al banco** | ✅ Sí | Las preguntas están disponibles globalmente |

#### 4. Seleccionar Archivo

- Arrastra el archivo a la zona de drop
- O haz clic para abrir selector

El sistema **automáticamente**:
- ✓ Detecta el formato
- ✓ Extrae las preguntas
- ✓ Valida estructura
- ✓ Identifica errores
- ✓ Muestra vista previa

#### 5. Vista Previa

Revisa antes de importar:

```
┌──────────────────────────────────┐
│  Total: 150                      │
│  Válidas: 142 ✓                  │
│  Con avisos: 5 ⚠️                 │
│  Con errores: 3 ✗                │
└──────────────────────────────────┘
```

**Acciones disponibles:**
- Ver detalles de cada pregunta
- Identificar errores específicos
- Cambiar archivo si necesario
- Proceder con importación

#### 6. Importar

1. Clic en **"Importar X preguntas"**
2. El proceso muestra barra de progreso
3. Se procesan en lotes de 50

#### 7. Completado

Resumen final:
- ✅ Importadas: X
- ⏭️ Omitidas: Y
- Link directo al Gestor

### Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "Respuesta correcta inválida" | Formato incorrecto (ej: "a" en vez de "A") | Activa "Corrección automática" |
| "Falta campo obligatorio" | JSON incompleto | Usa plantilla oficial |
| "Opciones mal formateadas" | Estructura incorrecta | Verifica formato JSON de opciones |
| "Tema no encontrado" | Código de tema inexistente | Usa códigos válidos (01.01, etc.) |

### Importación Masiva (JSON del servidor)

Para importar preguntas ya en el servidor:

1. Coloca archivos JSON en `/public/questions-data/`
2. Ve a "Importación en Lote"
3. El sistema procesa automáticamente todos los archivos

**Formato esperado:**
```
/public/questions-data/
  ├── tema-01.json
  ├── tema-02.json
  └── ...
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Validar 5000 preguntas nuevas

**Objetivo:** Procesar lote masivo con máxima calidad

**Procedimiento:**
1. Importar las 5000 preguntas (estado: PENDING)
2. Ir a Gestor de Preguntas
3. Filtrar por: Estado = Pendientes
4. Seleccionar todas (o lotes de 500)
5. Auto-Validar Alta Calidad
6. Dejar proceso corriendo (estimado: 8-10 horas)
7. Al finalizar, filtrar por:
   - ✅ Validadas → Publicar directamente
   - ⚠️ Revisar → Revisar manualmente top errores
   - 🚫 Cuarentena → Mejora manual o descarte

**Resultado esperado:**
- ~60-70% Validadas automáticamente
- ~25-30% Requieren revisión
- ~5-10% En cuarentena

### Caso 2: Mejorar preguntas existentes

**Objetivo:** Enriquecer explicaciones de preguntas antiguas

**Procedimiento:**
1. Filtrar por: Estado = Sin revisar por IA
2. Tema específico (ej: 01.XX)
3. Seleccionar lote (ej: 100 preguntas)
4. Auto-Validar
5. Revisar las "Mejoradas" para ver enriquecimientos

**Resultado esperado:**
- Explicaciones más completas
- Referencias legales literales
- Mejor calidad pedagógica

### Caso 3: Auditoría de calidad

**Objetivo:** Identificar preguntas problemáticas

**Procedimiento:**
1. Filtrar por: 🚫 Cuarentena
2. Ordenar por tema
3. Exportar JSON
4. Revisar manualmente
5. Corregir o eliminar

**Criterios de decisión:**
- Puntuación <60: Eliminar
- Puntuación 60-74: Mejorar manualmente
- Errores legales: Eliminar inmediatamente

### Caso 4: Preparar examen oficial

**Objetivo:** Seleccionar solo preguntas de máxima calidad

**Procedimiento:**
1. Filtrar por: ✅ Validadas
2. Temas del temario oficial
3. Dificultad: Media + Difícil
4. Exportar JSON
5. Crear cuestionario desde JSON exportado

**Garantía de calidad:**
- Todas con puntuación ≥90
- Verificadas legalmente
- Referencias exactas

---

## 🔧 Resolución de Problemas

### Problema 1: "Validación lenta"

**Síntomas:**
- Más de 10 segundos por pregunta
- Proceso se congela

**Causas posibles:**
1. Rate limits de API
2. Conexión lenta
3. Preguntas muy complejas

**Soluciones:**
- Reducir lote a 100 preguntas
- Verificar conexión
- Revisar logs del navegador (F12 → Console)

### Problema 2: "Errores en importación"

**Síntomas:**
- "Error al parsear archivo"
- "Formato no reconocido"

**Soluciones:**
1. Verifica encoding del archivo (UTF-8)
2. Valida JSON en jsonlint.com
3. Usa plantilla oficial
4. Activa "Corrección automática"

### Problema 3: "Contador en 0"

**Síntomas:**
- Procesadas: 140
- Validadas: 0
- Revisar: 0
- Cuarentena: 0

**Causa:** Bug crítico (ya corregido en commit `8512354`)

**Solución:** Sistema ya actualizado, no debería ocurrir

### Problema 4: "Muchas en Cuarentena"

**Síntomas:**
- >50% de preguntas van a cuarentena

**Causas:**
- Preguntas de baja calidad inicial
- Sin explicaciones
- Errores legales

**Soluciones:**
1. Revisar fuente de las preguntas
2. Pre-procesar manualmente
3. Usar threshold más bajo (ej: 50)

---

## ✅ Mejores Prácticas

### Para Validación IA

1. **Lotes moderados**
   - Ideal: 100-500 preguntas por lote
   - Evita: >1000 en una sola sesión

2. **Horario nocturno**
   - Inicia proceso al final del día
   - Permite 8-12 horas de ejecución
   - Revisa resultados por la mañana

3. **Revisión post-validación**
   - SIEMPRE revisa las "Validadas" muestreando 10-20
   - Verifica que las referencias legales sean correctas
   - Confirma que las explicaciones sean pedagógicas

4. **Threshold dinámico**
   - Para preguntas nuevas: `threshold = 60`
   - Para preguntas legacy: `threshold = 70`
   - Para exámenes oficiales: `threshold = 85`

### Para Importación

1. **Estructura consistente**
   - Usa siempre el mismo formato
   - Mantén plantillas actualizadas
   - Valida antes de importar masivamente

2. **Backup antes de importar**
   - Exporta preguntas actuales
   - Guarda JSON de importación
   - Permite rollback si necesario

3. **Importación incremental**
   - Primero: 10 preguntas (prueba)
   - Luego: 100 preguntas (verificación)
   - Finalmente: Lote completo

4. **Validación posterior**
   - Después de importar, valida con IA
   - No publiques directamente
   - Marca como "pendientes" inicialmente

### Para Gestión General

1. **Auditorías periódicas**
   - Mensual: Revisa preguntas en cuarentena
   - Trimestral: Audita validadas aleatoriamente
   - Anual: Re-validación completa

2. **Documentación actualizada**
   - Mantén registro de cambios en preguntas
   - Documenta decisiones de cuarentena
   - Registra fechas de validación

3. **Equipo coordinado**
   - Asigna responsables por temas
   - Comunica cambios masivos
   - Revisa en equipo preguntas dudosas

---

## 📊 Métricas de Calidad

### KPIs Recomendados

| Métrica | Objetivo | Cómo medirlo |
|---------|----------|--------------|
| **Tasa de Validación** | >60% | Validadas / Total |
| **Tasa de Cuarentena** | <10% | Cuarentena / Total |
| **Cobertura de IA** | >95% | Revisadas / Total |
| **Calidad Media** | >85 | Promedio de scores |

### Dashboard Sugerido

```
┌────────────────────────────────────────────┐
│  📊 Estado del Banco de Preguntas          │
├────────────────────────────────────────────┤
│  Total preguntas: 5,511                    │
│                                            │
│  ✅ Validadas (≥90):    3,307  (60%)       │
│  ⚠️  Revisar (75-89):   1,654  (30%)       │
│  🚫 Cuarentena (<75):     550  (10%)       │
│                                            │
│  🔧 Mejoradas por IA:   4,961  (90%)       │
│  📅 Última validación: 23/02/2026          │
└────────────────────────────────────────────┘
```

---

## 🆘 Soporte y Contacto

**Documentación adicional:**
- [SISTEMA_AUTOVALIDACION_IA.md](SISTEMA_AUTOVALIDACION_IA.md)
- [RESUMEN_SESION_23FEB2026.md](RESUMEN_SESION_23FEB2026.md)
- [INSTRUCCIONES_MAÑANA_24FEB.md](INSTRUCCIONES_MAÑANA_24FEB.md)

**Historial de versiones:**
- v2.0 (23/02/2026): Sistema híbrido Llama+GPT-4o
- v1.5 (23/02/2026): Filtros avanzados
- v1.0 (23/02/2026): Validación IA básica

---

**© 2026 OpositApp - Sistema de Validación IA Profesional**
