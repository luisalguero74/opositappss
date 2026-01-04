# 🤖 Sistema de Generación de Preguntas con IA - opositAPPSS

## 📋 Descripción

Sistema completamente **GRATUITO** que utiliza **Ollama** (IA local) para generar automáticamente preguntas tipo test basadas en documentación legal de oposiciones de Seguridad Social.

### ✨ Características

- ✅ **100% Gratuito** - Sin costos de API
- ✅ **IA Local** - Todo se ejecuta en tu Mac
- ✅ **Privacidad total** - Los documentos no salen de tu ordenador
- ✅ **Sin límites** - Genera tantas preguntas como necesites
- ✅ **Revisión manual** - Aprueba/edita antes de usar
- ✅ **Integración automática** - Las preguntas aprobadas se usan en simulacros

## 🚀 Estado de la Instalación

✅ **Ollama instalado** - Servicio ejecutándose en http://localhost:11434
⏳ **Modelo descargando** - llama3.2:3b (~2GB) - Puede tardar 1-2 horas según tu conexión
✅ **Base de datos actualizada** - Nuevas tablas creadas
✅ **APIs creadas** - Endpoints funcionando
✅ **Panel admin creado** - Interfaz web lista

## 📖 Cómo Usar

### 1. Esperar a que termine la descarga del modelo

El modelo Llama 3.2 se está descargando en segundo plano. Puedes verificar el progreso:

\`\`\`bash
# Ver modelos disponibles
ollama list

# Una vez descargado, verás:
# NAME             ID              SIZE     MODIFIED
# llama3.2:3b      xxx             2.0 GB   X seconds ago
\`\`\`

### 2. Acceder al Panel de Administración

1. Ve a: **http://localhost:3000/admin/ai-documents**
2. Verás dos pestañas:
   - **📄 Documentos** - Para subir y gestionar documentos
   - **❓ Preguntas IA** - Para revisar preguntas generadas

### 3. Subir Documentos Legales

**Formatos aceptados:** PDF o TXT

**Tipos de documento:**
- Temario General
- Temario Específico  
- Ley
- Real Decreto
- Orden Ministerial
- Reglamento

**Ejemplo de carga:**
- **Título:** Ley 39/2015 del Procedimiento Administrativo Común
- **Tipo:** Ley
- **Referencia:** Ley 39/2015
- **Archivo:** ley-39-2015.pdf

### 4. Generar Preguntas

1. Una vez subido el documento, aparecerá en la lista
2. Haz clic en **"🤖 Generar 10 Preguntas"**
3. El sistema:
   - Divide el documento en secciones
   - Envía cada sección a Ollama
   - Genera preguntas con formato oficial
   - Las guarda para revisión

**Tiempo estimado:** 30-60 segundos por cada 10 preguntas

### 5. Revisar y Aprobar Preguntas

1. Ve a la pestaña **"❓ Preguntas IA"**
2. Verás todas las preguntas pendientes de revisión
3. Cada pregunta muestra:
   - Texto de la pregunta
   - 4 opciones (A, B, C, D)
   - Respuesta correcta marcada en verde
   - Explicación
   - Nivel de dificultad

4. **Acciones disponibles:**
   - ✓ **Aprobar** - La pregunta se usará en simulacros
   - 🗑 **Eliminar** - Descartar la pregunta
   - ↩ **Desaprobar** - Quitar de aprobadas

### 6. Preguntas en Simulacros

**Distribución automática:**
- **60%** preguntas manuales (subidas por ti tradicionalmente)
- **40%** preguntas IA aprobadas

**Total:** 70 preguntas de teoría por simulacro

Si no hay suficientes preguntas manuales, el sistema usará más preguntas IA aprobadas.

## 🔧 Comandos Útiles

\`\`\`bash
# Ver estado de Ollama
brew services list | grep ollama

# Parar Ollama
brew services stop ollama

# Iniciar Ollama
brew services start ollama

# Ver modelos instalados
ollama list

# Probar generación manual
ollama run llama3.2:3b "Genera una pregunta tipo test sobre Seguridad Social"

# Ver logs de Ollama
tail -f ~/Library/Logs/Homebrew/ollama/stderr.log
\`\`\`

## 📊 Calidad de las Preguntas

El modelo Llama 3.2 (3B parámetros) genera preguntas de **calidad media**. 

**Recomendaciones:**
- ✅ **Siempre revisar** antes de aprobar
- ✅ Editar si es necesario
- ✅ Eliminar preguntas obvias o incorrectas
- ✅ Usar más preguntas manuales para exámenes importantes

**Para mejor calidad (opcional, futuro):**
- Modelo más grande: \`ollama pull llama3.1:8b\` (5GB)
- O migrar a OpenAI GPT-4 (de pago)

## 🎯 Flujo de Trabajo Recomendado

1. **Recopilar documentos** - BOE, temarios oficiales, leyes
2. **Subir en lotes** - 5-10 documentos a la vez
3. **Generar preguntas** - 10-20 por documento
4. **Sesión de revisión** - Dedicar 1-2 horas a revisar
5. **Aprobar las buenas** - Solo las de alta calidad
6. **Usar en simulacros** - Los usuarios verán mix de manuales + IA

## 🐛 Solución de Problemas

### "Ollama no está disponible"

\`\`\`bash
# Verificar que el servicio esté corriendo
brew services list | grep ollama

# Si está stopped, iniciarlo
brew services start ollama

# Esperar 10 segundos y volver a intentar
\`\`\`

### "No se pudieron generar preguntas"

- Asegúrate de que el modelo se haya descargado completamente
- Verifica con: \`ollama list\`
- Prueba con un documento más corto primero

### "Error al subir documento"

- Solo PDF o TXT
- Tamaño máximo recomendado: 10MB
- El PDF debe tener texto seleccionable (no imagen escaneada)

## 📈 Estadísticas del Sistema

El sistema rastrea:
- ✅ Documentos procesados
- ✅ Secciones creadas
- ✅ Preguntas generadas
- ✅ Preguntas aprobadas
- ✅ Preguntas usadas en simulacros

Puedes ver estas métricas en el panel de administración.

## 🔮 Mejoras Futuras

- [ ] Generación de explicaciones más detalladas
- [ ] Clasificación automática de dificultad
- [ ] Detección de preguntas duplicadas
- [ ] Exportar preguntas a Excel
- [ ] Estadísticas de calidad por documento
- [ ] Sistema de feedback de usuarios

## 💡 Consejos Pro

1. **Documentos más cortos = mejores preguntas**
   - Divide documentos largos en secciones

2. **Genera desde secciones específicas**
   - Más control sobre el contenido

3. **Revisa en grupo**
   - Varias personas mejoran la calidad

4. **Mantén estadísticas**
   - Rastrea qué documentos generan mejores preguntas

---

**¿Necesitas ayuda?** Abre un issue o contacta al equipo de desarrollo.

**Versión:** 1.0.0 - Sistema IA con Ollama
**Última actualización:** Diciembre 2025
