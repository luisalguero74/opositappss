# Generador de Supuestos Prácticos con IA

## Características

### Formatos de Archivo Soportados
El generador ahora acepta múltiples formatos de documentos legales:

- **PDF** (.pdf) - Documentos en formato PDF
- **TXT** (.txt) - Archivos de texto plano
- **EPUB** (.epub) - Libros electrónicos
- **Word** (.doc, .docx) - Documentos de Microsoft Word

### Modos de Operación

#### 1. Temas Predefinidos
- Selecciona temas del temario general y específico ya cargados
- Útil para generar supuestos basados en el contenido oficial

#### 2. Subir Documentos
- Carga tus propios documentos legales
- Soporta múltiples archivos simultáneamente
- Cada archivo es procesado y parseado automáticamente
- Ideal para contenido personalizado o actualizado

## Proceso de Generación

1. **Selecciona el modo**: Temas predefinidos o Subir documentos
2. **Proporciona un título**: Nombre descriptivo del supuesto práctico
3. **Selecciona/Sube contenido**: 
   - Modo predefinido: Marca checkboxes de temas
   - Modo upload: Arrastra o selecciona archivos
4. **Genera**: La IA creará 15 preguntas profesionales con:
   - Enunciado del caso (200-400 palabras)
   - 15 preguntas tipo test (A, B, C, D)
   - Respuestas correctas distribuidas aleatoriamente
   - Solucionario motivado con referencias legales

## Tecnologías Utilizadas

- **Groq API** (llama-3.3-70b-versatile) para generación de contenido
- **pdf-parse** para archivos PDF
- **mammoth** para documentos Word
- **epub** para libros electrónicos
- **Next.js 15** con App Router

## Notas Importantes

- Los supuestos generados se crean como **NO PUBLICADOS** por defecto
- El administrador debe revisar y aprobar antes de publicar
- Los archivos se procesan en memoria, no se almacenan permanentemente
- El contenido legal debe ser relevante para Seguridad Social (C1)
