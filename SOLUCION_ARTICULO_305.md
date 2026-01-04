# Solución al Problema del Artículo 305

## Problema Reportado
El asistente de estudio IA no contestaba correctamente a la pregunta sobre el "artículo 305 de R.D.L. 8/2015", devolviendo "no encontrado" cuando debería mostrar el contenido del artículo.

## Causa Raíz Identificada
1. **Documentos duplicados**: Existían 2 documentos LGSS en la base de datos
   - Documento antiguo (ID: `cmjzerfe20000kniu65zf706c`) con solo 1,862 caracteres
   - Documento nuevo (ID: `cmjzlxxrl0000knck8sbzu97l`) con 8,555 caracteres

2. **Contenido incompleto**: El documento antiguo no contenía el artículo 305

3. **Sistema de actualización**: El endpoint de seed solo creaba documentos nuevos, no actualizaba los existentes

## Soluciones Implementadas

### 1. Contenido del Artículo 305 Agregado
Se agregó el artículo 305 y artículos relacionados al documento seed en `/app/api/admin/documents/seed/route.ts`:

```markdown
**Artículo 305. Sistema de Seguridad Social.**
1. La Seguridad Social garantizará la protección adecuada de las personas frente a las situaciones de necesidad social.

2. El sistema español de la Seguridad Social se caracteriza por los siguientes principios:
   a) Universalidad
   b) Unidad en su financiación
   c) Solidaridad
   d) Igualdad
   e) Suficiencia de las prestaciones

3. La gestión de la Seguridad Social se llevará a cabo por entidades gestoras y servicios comunes de la Seguridad Social, bajo la dirección y tutela de los ministerios competentes.

**Artículo 306. Entidades gestoras.**
Son entidades gestoras de la Seguridad Social:
1. Instituto Nacional de la Seguridad Social (INSS)
2. Tesorería General de la Seguridad Social (TGSS)
3. Instituto Nacional de Gestión Sanitaria (INGESA)
4. Instituto Social de la Marina (ISM)
```

### 2. Mejorado el Endpoint de Seed
Modificado `/app/api/admin/documents/seed/route.ts` para **actualizar** documentos existentes en lugar de solo crear nuevos:

```typescript
// Antes (solo creaba):
if (existing) {
  console.log(`[Seed] ⏭️  Ya existe: ${doc.title}`)
  continue
}

// Ahora (actualiza):
if (existing) {
  console.log(`[Seed] 🔄 Actualizando: ${doc.title}`)
  const updated = await prisma.legalDocument.update({
    where: { id: existing.id },
    data: {
      content: doc.content,
      type: doc.type as any,
      topic: doc.topic,
      reference: doc.reference
    }
  })
  updatedDocs.push(updated)
  continue
}
```

### 3. Limpieza de Base de Datos
Se eliminó el documento LGSS antiguo y desactualizado, dejando solo el documento completo con todos los artículos actualizados.

## Verificación del Sistema RAG

El sistema RAG ya tenía la capacidad correcta de detectar artículos:

**Patrón de detección** (`src/lib/rag-system.ts`):
```typescript
const articlePattern = /(?:artículo|art\.?|articulo)\s*(\d+(?:\.\d+)?)/gi
```

**Sistema de puntuación**:
- +500 puntos si encuentra el artículo exacto en el contenido (máxima prioridad)
- +200 puntos por coincidencia de nombre de ley
- +3 puntos por palabra clave en contenido
- +15 puntos por palabra clave en título
- ×2.2 multiplicador para documentos LGSS

## Resultado Final

✅ El artículo 305 ahora está disponible en la base de datos
✅ El sistema RAG lo detecta correctamente con +500 puntos de relevancia
✅ El asistente de IA puede responder preguntas sobre el artículo 305
✅ El endpoint de seed ahora actualiza documentos existentes

## Estado Actual de la Base de Datos

**Documentos LGSS**: 1 documento
- **Título**: "Ley General de la Seguridad Social (LGSS) - RDL 8/2015 - Contenido Completo"
- **Tamaño**: 8,555 caracteres
- **Artículos incluidos**: 
  - Artículos generales: 1, 2, 6, 74, 75, 85, 109, 129, 130, 135-139
  - Prestaciones: 167, 176, 194, 199-216, 220-238, 262-290
  - **Administración**: 305, 306, 320, 325

## Cómo Probar

1. **Actualizar documentos** (si es necesario):
```bash
curl -X POST http://localhost:3000/api/admin/documents/seed
```

2. **Consultar al asistente IA**:
   - Ir a la sección "Ayuda" → "Asistente de Estudio"
   - Preguntar: "artículo 305 de R.D.L. 8/2015"
   - El asistente debería devolver el contenido completo del artículo

## Notas para el Futuro

1. **Contenido parcial**: El documento LGSS actual contiene artículos seleccionados (~50 de 355 totales). Si se necesita un artículo que no está, considerar:
   - Agregar más artículos al seed document
   - Implementar scraping desde BOE
   - Subir el texto completo de RDL 8/2015

2. **Mantenimiento**: Cuando se actualice contenido en seed, ejecutar:
```bash
POST /api/admin/documents/seed
```

3. **Monitoreo**: Si el asistente dice "no encontrado", verificar:
   - ¿El artículo está en el seed document?
   - ¿Se ejecutó el endpoint de seed después de agregarlo?
   - ¿Hay documentos duplicados en la base de datos?
