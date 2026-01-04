# 🎯 Demostración del Sistema de Fundamento Legal Mejorado

## Objetivo

Verificar que el sistema de búsqueda inteligente de fundamentos legales está funcionando correctamente.

---

## Prerequisitos

- ✅ Servidor de desarrollo corriendo: `npm run dev`
- ✅ Base de datos PostgreSQL funcionando
- ✅ Al menos 1 usuario con respuestas falladas

---

## Paso 1: Verificar Estado del Sistema

### 1.1 Ejecutar Script de Verificación

```bash
npx tsx scripts/verify-legal-foundations.ts
```

**Salida esperada:**
```
📊 Total de preguntas: 286
✅ Preguntas con referencia legal: 114 (40%)
❌ Preguntas sin referencia legal: 172 (60%)

📖 DOCUMENTOS LEGALES DISPONIBLES
Total de documentos activos: 33
```

**Interpretación:**
- Si ves 33 documentos → ✅ Sistema tiene material para buscar
- Si ves 0 documentos → ⚠️ Necesitas cargar documentos legales

---

## Paso 2: Acceder a la Pestaña Recomendaciones

### 2.1 Navegar a Estadísticas

1. Abre el navegador en `http://localhost:3000`
2. Inicia sesión con un usuario que tenga respuestas
3. Ve a **Estadísticas** (menú lateral o `/statistics`)

### 2.2 Abrir Pestaña Recomendaciones

4. Haz clic en la pestaña **"Recomendaciones"**
5. Espera a que carguen los datos (~2-3 segundos)

**Pantalla esperada:**
```
┌─────────────────────────────────────────┐
│ General │ Fallos Recientes │ Errores │ │
│         │                  │ Repetidos│ │
│         │                  │          │ │
│ [RECOMENDACIONES]  ← Esta pestaña      │
└─────────────────────────────────────────┘
```

---

## Paso 3: Verificar Fundamentos Legales

### 3.1 Sección "Preguntas con Más Errores"

Deberías ver una tabla similar a:

```
┌──────────────────────────────────────────────────────────┐
│ Pregunta                    │ Fundamento Legal           │
├──────────────────────────────────────────────────────────┤
│ ¿Cuál es el plazo máximo... │ artículo 21 de la Ley      │
│                             │ 39/2015 de Procedimiento   │
│                             │ Administrativo Común       │
├──────────────────────────────────────────────────────────┤
│ ¿Qué prestaciones cubre...  │ artículo 42 del Real      │
│                             │ Decreto Legislativo 8/2015 │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Tipos de Fundamentos que Verás

**Caso 1: Fundamento Específico (Mejor)**
```
✅ "artículo 21 de la Ley 39/2015 de Procedimiento Administrativo Común"
```
- Indica ley + artículo específico
- Estudiante sabe exactamente qué leer

**Caso 2: Fundamento General**
```
⚠️ "Consultar Real Decreto Legislativo 8/2015 - Ley General de Seguridad Social"
```
- Indica documento general
- Sistema no encontró artículo específico
- Estudiante debe buscar dentro del documento

**Caso 3: Sin Fundamento**
```
❌ "Fundamento legal no especificado. Consulta el temario o normativa aplicable..."
```
- Sistema no encontró referencia
- Pregunta muy genérica o falta documento en BD

---

## Paso 4: Verificar Mejoras vs Versión Anterior

### 4.1 Comparar con Versión Anterior

**Antes de la mejora:**
- Mayoría de preguntas tendrían: _"Artículo no especificado en la pregunta. Revisa el temario correspondiente."_

**Después de la mejora:**
- Mayoría de preguntas deberían tener referencias específicas

### 4.2 Calcular Porcentaje de Mejora

Cuenta manualmente:
- Total de preguntas en "Preguntas con Más Errores": **X**
- Preguntas con fundamento específico (caso 1): **A**
- Preguntas con fundamento general (caso 2): **B**
- Preguntas sin fundamento (caso 3): **C**

**Fórmula:**
```
Tasa de éxito = (A + B) / X * 100%

Meta: > 80%
```

**Ejemplo:**
```
X = 15 preguntas
A = 11 (fundamento específico)
B = 3 (fundamento general)
C = 1 (sin fundamento)

Tasa = (11 + 3) / 15 = 93% ✅
```

---

## Paso 5: Probar Casos Específicos

### 5.1 Caso de Prueba: Pregunta con Artículo Explícito

**Busca una pregunta que contenga:**
- "artículo X"
- "según el artículo"
- "conforme al artículo"

**Resultado esperado:**
```
✅ Sistema debería encontrar y enriquecer:
Input: "artículo 12"
Output: "artículo 12 de la Ley 39/2015"
```

### 5.2 Caso de Prueba: Pregunta Sin Referencia Explícita

**Busca una pregunta sobre procedimiento administrativo que NO mencione artículos**

**Ejemplo:**
```
Pregunta: "¿Cuál es el plazo para resolver?"
```

**Resultado esperado:**
```
✅ Sistema debería buscar en documentos:
- Identifica tema: "Procedimiento administrativo"
- Busca en Ley 39/2015
- Encuentra: "artículo 21 de la Ley 39/2015"
```

### 5.3 Caso de Prueba: Pregunta Muy Genérica

**Busca una pregunta muy general**

**Ejemplo:**
```
Pregunta: "¿Qué es la Seguridad Social?"
```

**Resultado esperado:**
```
⚠️ Sistema debería devolver documento general:
"Consultar Real Decreto Legislativo 8/2015 - Ley General de Seguridad Social"

o

❌ "Fundamento legal no especificado..."
```

---

## Paso 6: Verificar Performance

### 6.1 Abrir Consola del Navegador

1. Presiona `F12` o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Network**
3. Filtra por `statistics`

### 6.2 Recargar Pestaña Recomendaciones

4. Haz clic en otra pestaña y vuelve a **Recomendaciones**
5. Observa el request a `/api/statistics`

**Métricas esperadas:**
```
Request: GET /api/statistics
Status: 200 OK
Time: < 500ms (idealmente < 300ms)
Size: ~50-100KB
```

### 6.3 Verificar Tiempo de Respuesta

En la consola del servidor (terminal donde corre `npm run dev`):

```
GET /api/statistics 200 in 250ms
```

**Interpretación:**
- < 300ms → ✅ Excelente
- 300-500ms → ✅ Bueno
- 500-1000ms → ⚠️ Aceptable (revisar queries)
- > 1000ms → ❌ Lento (necesita optimización)

---

## Paso 7: Verificar en Consola del Navegador

### 7.1 Ver Response del API

En la pestaña **Network** del navegador:

1. Haz clic en el request `statistics`
2. Ve a la pestaña **Response**
3. Busca `studyRecommendations.failedQuestions`

**Deberías ver algo como:**
```json
{
  "studyRecommendations": {
    "failedQuestions": [
      {
        "questionText": "¿Cuál es el plazo máximo para resolver...?",
        "questionnaireTitle": "Tema 1 - Procedimiento Administrativo",
        "correctAnswer": "Tres meses",
        "legalArticle": "artículo 21 de la Ley 39/2015 de Procedimiento Administrativo Común",
        "errors": 3
      }
    ]
  }
}
```

### 7.2 Verificar Calidad de legalArticle

**Busca patrones como:**
```javascript
// ✅ BUENOS (fundamentos específicos)
"artículo 21 de la Ley 39/2015"
"artículo 103 de la Constitución Española de 1978"
"artículo 42 del Real Decreto Legislativo 8/2015"

// ⚠️ ACEPTABLES (documentos generales)
"Consultar Real Decreto Legislativo 8/2015"
"Ley 39/2015 de Procedimiento Administrativo Común"

// ❌ NO IDEAL (sin fundamento)
"Fundamento legal no especificado..."
```

**Calcula proporción:**
```
Buenos / Total > 70% → ✅ Sistema funcionando bien
Buenos / Total < 50% → ⚠️ Revisar documentos en BD
```

---

## Paso 8: Test de Integración End-to-End

### 8.1 Flujo Completo

1. ✅ Usuario falla una pregunta en un test
2. ✅ Ve estadísticas → Recomendaciones
3. ✅ Lee el fundamento legal de esa pregunta
4. ✅ Estudia ese artículo específico
5. ✅ Repite el test
6. ✅ Acierta la pregunta

### 8.2 Verificación Manual

**Pregunta de ejemplo:**
```
ID: cm...
Texto: "¿Cuál es el plazo máximo para resolver un procedimiento administrativo?"
Fundamento encontrado: "artículo 21 de la Ley 39/2015"
```

**Verificación:**
1. Busca el artículo 21 de la Ley 39/2015 en internet
2. Confirma que efectivamente habla de plazos
3. ✅ Si coincide → Sistema funcionando correctamente

---

## Paso 9: Reportar Resultados

### 9.1 Crear Reporte de Testing

**Plantilla:**
```markdown
## Test del Sistema de Fundamento Legal

**Fecha:** [Fecha]
**Tester:** [Nombre]

### Resultados Generales
- Total preguntas analizadas: X
- Con fundamento específico: A (X%)
- Con fundamento general: B (X%)
- Sin fundamento: C (X%)

### Performance
- Tiempo de carga: Xms
- Tiempo del API: Xms
- Estado del servidor: ✅/❌

### Casos de Prueba
1. Pregunta con artículo explícito: ✅/❌
2. Pregunta sin referencia: ✅/❌
3. Pregunta genérica: ✅/❌

### Observaciones
[Notas adicionales]

### Recomendaciones
[Mejoras sugeridas]
```

---

## Paso 10: Troubleshooting

### Problema 1: "Fundamento legal no especificado" en todas las preguntas

**Causa posible:**
- No hay documentos legales en la BD

**Solución:**
```bash
# Verificar documentos
npx tsx scripts/verify-legal-foundations.ts

# Si muestra 0 documentos, necesitas cargarlos
# (depende de tu script de carga)
```

### Problema 2: Tiempo de respuesta > 1s

**Causa posible:**
- Demasiadas queries a la BD
- Documentos muy grandes

**Solución:**
```typescript
// Revisa logs del servidor
// Identifica queries lentas
// Considera añadir índices en la BD
```

### Problema 3: Fundamentos incorrectos

**Ejemplo:**
```
Pregunta sobre Seguridad Social
Fundamento: "artículo 12 de la Constitución" ← Incorrecto
```

**Causa posible:**
- Búsqueda amplia encontró coincidencia parcial incorrecta

**Solución:**
1. Añade referencia correcta en la explicación de la pregunta
2. O carga documento específico de ese tema
3. O mejora el `temaCodigo` de la pregunta

---

## Conclusión

Si has llegado aquí y:
- ✅ Ves fundamentos legales en la pestaña Recomendaciones
- ✅ La mayoría (>70%) son referencias específicas
- ✅ El tiempo de respuesta es < 500ms
- ✅ No hay errores en la consola

**🎉 ¡El sistema está funcionando correctamente!**

---

## Próximos Pasos

1. **Uso diario:** Anima a estudiantes a usar las recomendaciones
2. **Feedback:** Recopila opiniones sobre calidad de fundamentos
3. **Mejora continua:** Carga más documentos legales
4. **Monitoreo:** Ejecuta `verify-legal-foundations.ts` mensualmente

---

## Recursos

- [Documentación Técnica](FUNDAMENTO_LEGAL_MEJORADO.md)
- [Guía de Usuario](GUIA_FUNDAMENTO_LEGAL.md)
- [Ejemplos](EJEMPLOS_FUNDAMENTO_LEGAL.md)
- [Changelog](CHANGELOG_FUNDAMENTO_LEGAL.md)
- [README Principal](README.md)
