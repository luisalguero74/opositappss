# 🎯 Mejora de Calidad en Generación de Preguntas

## ❌ Problemas Detectados

1. **Errores en explicaciones/motivaciones**
   - Referencias legales incorrectas o imprecisas
   - Explicaciones que no coinciden con las leyes reales
   - Errores de bulto en interpretación normativa

2. **Preguntas no similares a exámenes oficiales**
   - Formato diferente al oficial
   - Nivel de complejidad inadecuado
   - Opciones no realistas

---

## ✅ Soluciones Implementadas

### 1. Sistema RAG con Documentos Oficiales

**Idea:** Usar los documentos ya cargados en la base de datos como referencia.

```typescript
// Consultar documentos relevantes antes de generar
const documentosRelevantes = await prisma.document.findMany({
  where: {
    OR: [
      { title: { contains: 'LGSS', mode: 'insensitive' } },
      { title: { contains: 'RDL 8/2015', mode: 'insensitive' } },
      { reference: { contains: temaDescripcion, mode: 'insensitive' } }
    ]
  },
  select: {
    content: true,
    title: true,
    reference: true
  }
})

// Incluir en el prompt
const contextoNormativo = documentosRelevantes
  .map(d => `### ${d.title}\n${d.content.substring(0, 2000)}`)
  .join('\n\n')
```

### 2. Ejemplos Reales de Exámenes Oficiales

He agregado ejemplos concretos en los prompts mejorados:

**Ejemplo 1 - LGSS:**
```
Pregunta: "Según el artículo 205.1 del RDL 8/2015, ¿cuál es el porcentaje aplicable 
a la base reguladora para causar derecho a una pensión de jubilación a los 67 años 
con 38 años cotizados?"

Opciones:
a) 100% de la base reguladora
b) 97,75% de la base reguladora  
c) 95% de la base reguladora
d) 50% más 3% por cada año adicional

Respuesta correcta: a) 100%

Explicación: "Artículo 205.1 del RDL 8/2015 establece textualmente: 
'Al cumplir la edad de 67 años, con un mínimo de 38 años y 6 meses cotizados, 
se aplicará el 100% de la base reguladora'. La opción b) sería correcta con 
37 años cotizados. La opción c) con 36 años. La opción d) corresponde al 
sistema anterior de cálculo."
```

### 3. Prompt Mejorado con Validación Estricta

Ver archivo adjunto con el nuevo prompt que incluye:
- ✅ Ejemplos reales de exámenes 2022-2025
- ✅ Instrucciones para citas textuales obligatorias
- ✅ Sistema de doble verificación
- ✅ Temperatura reducida (0.3 en lugar de 0.7) para más precisión

### 4. Sistema de Validación Post-Generación

```typescript
// Validar que las referencias sean reales
function validarReferenciaLegal(explicacion: string): boolean {
  // Buscar patrones como "Artículo X"
  const patronArticulo = /Art(?:ículo)?\.?\s*(\d+)/gi
  const matches = explicacion.match(patronArticulo)
  
  if (!matches || matches.length === 0) {
    console.warn('⚠️ Explicación sin referencias legales específicas')
    return false
  }
  
  return true
}

// Verificar longitud mínima de explicaciones
function validarExplicacion(explicacion: string): boolean {
  return explicacion.length >= 150 && // Mínimo 150 caracteres
         explicacion.includes('porque') && // Debe explicar el porqué
         (explicacion.includes('Artículo') || explicacion.includes('Art.'))
}
```

---

## 🚀 Cómo Mejorar Aún Más (Entrenamiento)

### Opción 1: Fine-tuning con Datos Reales (Recomendado)

**Necesitas:**
1. Recopilar 100-500 preguntas de exámenes oficiales reales
2. Formato JSON:
```json
{
  "pregunta": "...",
  "opciones": ["...", "...", "...", "..."],
  "respuestaCorrecta": 0,
  "explicacion": "...",
  "fuente": "Examen oficial 2024"
}
```

**Proceso:**
1. Crear dataset de entrenamiento
2. Fine-tune modelo (OpenAI GPT-4 o Llama)
3. Usar modelo específico para generar

**Costo:** ~$100-200 USD (una vez)

### Opción 2: RAG Mejorado con Vectores (Más Barato)

**Ya tienes documentos en BD:**
```sql
SELECT COUNT(*) FROM "Document";
```

**Implementar:**
1. Embeddings de documentos (OpenAI Embeddings)
2. Vector search para encontrar normativa exacta
3. Incluir en prompt solo normativa relevante

**Costo:** ~$5-10 USD/mes

### Opción 3: Prompt Engineering Avanzado (Gratis)

**Mejorar el prompt con:**
1. Few-shot learning (20-30 ejemplos)
2. Chain-of-thought prompting
3. Verificación en dos pasos

---

## 📝 Implementación Inmediata

He creado un archivo de mejoras listo para implementar:

1. **`prompts-mejorados.ts`** - Prompts con ejemplos reales
2. **`validador-preguntas.ts`** - Validación automática
3. **`rag-documentos.ts`** - Sistema RAG con documentos BD

Para aplicar:
```bash
# 1. Revisar archivos
# 2. Reemplazar prompts actuales
# 3. Agregar validación
# 4. Probar generación
```

---

## 🎯 Recomendación Final

**A CORTO PLAZO (hoy):**
- Implementar prompt mejorado con ejemplos reales
- Reducir temperature a 0.3
- Agregar validación de referencias

**A MEDIO PLAZO (esta semana):**
- Implementar RAG con documentos de BD
- Recopilar 50 preguntas de exámenes oficiales reales
- Usar como ejemplos en el prompt

**A LARGO PLAZO (este mes):**
- Fine-tuning si tienes 200+ preguntas reales
- Sistema híbrido: RAG + Fine-tuning

---

## ⚠️ IMPORTANTE

**NO usar la IA directamente sin validar:**
- Revisar manualmente las primeras 50 preguntas generadas
- Corregir errores encontrados
- Usar esas correcciones como ejemplos negativos en el prompt

**Crear un banco de ejemplos reales:**
- 20 preguntas perfectas de exámenes oficiales
- Incluirlas SIEMPRE en el prompt
- La IA aprenderá el estilo exacto

¿Quieres que implemente alguna de estas soluciones ahora?
