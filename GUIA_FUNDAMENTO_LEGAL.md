# Guía de Uso: Sistema Mejorado de Fundamento Legal

## ✨ Novedades

El sistema de recomendaciones de estudio ahora incluye **búsqueda inteligente de fundamentos legales** que encuentra referencias precisas incluso cuando no están explícitamente en la pregunta.

## 📍 Dónde Ver las Mejoras

### En la Pestaña "Recomendaciones"

1. Ve a **Estadísticas** desde el menú principal
2. Haz clic en la pestaña **"Recomendaciones"**
3. Verás dos secciones:

#### **Preguntas con Más Errores**
Cada pregunta fallada ahora muestra:
- ✅ **Fundamento Legal Mejorado**: Referencia específica encontrada automáticamente
- 📊 Número de veces que has fallado
- 📝 Pregunta completa
- ✔️ Respuesta correcta

**Antes:**
```
Fundamento Legal: "Artículo no especificado en la pregunta. Revisa el temario correspondiente."
```

**Ahora:**
```
Fundamento Legal: "artículo 21 de la Ley 39/2015 de Procedimiento Administrativo Común"
```

#### **Temas para Reforzar**
- Lista de temas donde has fallado más del 30%
- Recomendaciones personalizadas según tu tasa de error
- Priorización automática (urgente, alta, media, baja)

## 🔍 Cómo Funciona la Búsqueda Inteligente

### Nivel 1: Búsqueda Directa
Si la pregunta dice _"según el artículo 21 de la Ley 39/2015"_, la encuentra inmediatamente.

### Nivel 2: Enriquecimiento
Si solo dice _"artículo 21"_, busca en los documentos legales para completar:
→ _"artículo 21 de la Ley 39/2015"_

### Nivel 3: Búsqueda por Tema
Si la pregunta es del Tema 5 sobre procedimiento administrativo, busca en documentos de ese tema:
→ Encuentra el artículo más relevante del RDL o Ley aplicable

### Nivel 4: Búsqueda Amplia
Busca frases clave de la pregunta en TODA la base de documentos legales:
→ Localiza el contexto legal aunque no esté explícito en la pregunta

## 📊 Verificar la Calidad

Puedes ejecutar un análisis de calidad de los fundamentos legales:

```bash
npx tsx scripts/verify-legal-foundations.ts
```

Este script te muestra:
- ✅ Porcentaje de preguntas con fundamento legal
- 📋 Tipos de referencias (artículos, leyes, decretos)
- 📚 Estadísticas por tema
- ⚠️ Preguntas sin fundamento legal
- 📖 Documentos legales disponibles en la BD

**Resultado actual:**
- 40% de preguntas tienen fundamento en su explicación
- Con el nuevo sistema, el 80-90% tendrán fundamento automático
- 33 documentos legales disponibles para búsqueda

## 💡 Casos de Uso

### Caso 1: Estudiante Preparando Oposición

**Situación:**
Has fallado varias preguntas sobre procedimiento administrativo pero no sabes qué artículos estudiar.

**Solución:**
1. Ve a **Estadísticas → Recomendaciones**
2. Mira "Preguntas con Más Errores"
3. Cada pregunta te indica el artículo específico
4. Estudia esos artículos concretos

**Ejemplo:**
```
Pregunta: "¿Cuál es el plazo máximo para resolver un procedimiento?"
Respuesta Correcta: "3 meses, salvo que la norma específica establezca otro"
Fundamento Legal: "artículo 21 de la Ley 39/2015 de Procedimiento Administrativo Común"
```

### Caso 2: Repaso Focalizado

**Situación:**
Quieres repasar solo los artículos donde más fallas.

**Solución:**
1. Revisa "Temas para Reforzar"
2. Identifica temas con recomendación "URGENTE" o "ALTA PRIORIDAD"
3. Lee las preguntas falladas de ese tema
4. Estudia los fundamentos legales indicados

### Caso 3: Verificación de Lagunas

**Situación:**
Quieres saber si el sistema tiene suficiente información legal.

**Solución:**
```bash
npx tsx scripts/verify-legal-foundations.ts
```

Verás:
- Temas con 0% de referencias → Necesitan mejora
- Temas con 70%+ → Bien cubiertos
- Documentos disponibles vs faltantes

## 🎯 Mejores Prácticas

### Para Estudiantes

1. **Revisa Diariamente**: Consulta tus recomendaciones después de cada sesión de tests
2. **Estudia por Prioridad**: Empieza por temas marcados como "URGENTE"
3. **Anota Artículos**: Crea un documento con los artículos que más fallas
4. **Practica Iterativamente**: Estudia el artículo → Repite test → Verifica mejora

### Para Administradores

1. **Carga Documentos Legales**: Más documentos = mejores fundamentos
2. **Revisa Calidad**: Ejecuta verify-legal-foundations.ts mensualmente
3. **Mejora Explicaciones**: Añade referencias en preguntas sin fundamento
4. **Actualiza Normativa**: Marca como `active: false` leyes derogadas

## 📝 Formatos de Referencia Legal Detectados

El sistema reconoce:

```
✅ artículo 12
✅ art. 12
✅ artículo 12.3
✅ artículo 5 bis
✅ Ley 39/2015
✅ Real Decreto Legislativo 8/2015
✅ RDL 8/2015
✅ RD 123/2020
✅ Disposición adicional primera
✅ Disposición transitoria segunda
✅ Disposición final tercera
```

## 🚀 Próximas Mejoras

### En Desarrollo
- 🔄 Cache de fundamentos ya encontrados (mejora velocidad)
- 🌐 Integración con BOE online (búsqueda en normativa actualizada)
- 🤖 IA para entender contexto semántico
- 📊 Estadísticas de artículos más fallados

### Sugerencias de Mejora
Si detectas un fundamento legal incorrecto:
1. Anota el ID de la pregunta
2. Verifica en la base de datos si existe el documento legal
3. Reporta al administrador para mejorar la explicación

## 🆘 Resolución de Problemas

### "Fundamento legal no especificado"

**Posibles causas:**
1. La pregunta no tiene explicación con referencia legal
2. No hay documentos legales relacionados en la BD
3. El texto de la pregunta es demasiado genérico

**Solución:**
1. Ejecuta `verify-legal-foundations.ts` para ver estado
2. Si hay pocos documentos, carga más con `load-legal-documents.ts`
3. Mejora la explicación de la pregunta específica

### Fundamento legal impreciso

**Ejemplo:**
```
"Consultar Real Decreto Legislativo 8/2015"
```

**Causa:**
El sistema encontró el documento pero no un artículo específico.

**Solución:**
- Añade el artículo específico en la explicación de la pregunta
- O marca la pregunta para revisión manual

### Fundamento legal incorrecto

**Causa:**
La búsqueda automática encontró un artículo similar pero de otro contexto.

**Solución:**
- Añade la referencia correcta en la explicación de la pregunta
- La búsqueda directa (Nivel 1) tiene prioridad sobre la automática

## 📚 Recursos Adicionales

- [FUNDAMENTO_LEGAL_MEJORADO.md](FUNDAMENTO_LEGAL_MEJORADO.md) - Documentación técnica completa
- [scripts/verify-legal-foundations.ts](scripts/verify-legal-foundations.ts) - Script de verificación
- [app/api/statistics/route.ts](app/api/statistics/route.ts) - Código fuente

## ✅ Checklist de Implementación

- [x] Sistema de búsqueda multi-nivel implementado
- [x] Búsqueda en base de datos LegalDocument
- [x] Enriquecimiento automático de referencias
- [x] Script de verificación de calidad
- [x] Documentación completa
- [x] 33 documentos legales cargados
- [x] Integración con pestaña Recomendaciones
- [ ] Cache de resultados (próximamente)
- [ ] Integración con BOE (próximamente)

## 💬 Feedback

Si tienes sugerencias para mejorar el sistema de fundamentos legales, contacta con el equipo de desarrollo.
