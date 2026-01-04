# 🚀 Inicio Rápido - Sistema de IA

## ✅ Estado Actual

- ✅ **Groq API**: Configurada y funcionando
- ✅ **Ollama**: Activo con modelo llama3.2:3b
- ✅ **Base de Datos**: Lista
- ✅ **Servidor**: Running en http://localhost:3000

---

## 📋 Pasos para Empezar

### **1. Procesar Documentos Existentes**

```bash
# Ve a la interfaz admin
http://localhost:3000/admin/ai-documents
```

**Opciones:**
- **Opción A (Rápido)**: Clic en **"⚡ Procesar Todos los Documentos"**
  - Procesa automáticamente todos los archivos en `documentos-temario/`
  
- **Opción B (Manual)**: Subir documento específico
  - Formulario de subida en la misma página
  - Seleccionar tipo, tema, archivo

### **2. Generar Preguntas con IA**

Una vez procesados los documentos:

1. En la lista de documentos, clic **"🤖 Generar Preguntas"**
2. Elegir cantidad (ej: 10 preguntas)
3. Seleccionar dificultad: Fácil / Medio / Difícil
4. Esperar generación (20-30 segundos con Groq)
5. Ver preguntas en tab **"Preguntas IA"**

### **3. Revisar y Aprobar Preguntas**

1. Tab **"Preguntas IA"**
2. Para cada pregunta:
   - ✏️ **Editar** si es necesario
   - ✅ **Aprobar** para usar en tests
   - ❌ **Eliminar** si no es válida
3. Solo las aprobadas aparecen en los tests

### **4. Usar el Asistente de Estudio**

```bash
# Interfaz para estudiantes
http://localhost:3000/asistente-estudio
```

**Modos disponibles:**
- 💬 **Chat**: Preguntas y respuestas generales
- 📖 **Explicar**: Explicación didáctica de conceptos
- 📝 **Resumir**: Resúmenes de temas/leyes

**Ejemplo de preguntas:**
- "¿Qué dice el artículo 14 de la Constitución?"
- "Explícame las prestaciones de la Seguridad Social"
- "Resume el Tema 5 del temario general"

---

## 🎯 Ejemplo Práctico

### Procesar Ley 39/2015 y generar preguntas

```bash
# 1. Subir PDF
# Ir a: http://localhost:3000/admin/biblioteca-legal
# Subir: Ley_39_2015.pdf

# 2. Procesar
# Ir a: http://localhost:3000/admin/ai-documents
# Clic: "⚡ Procesar Todos los Documentos"
# Esperar: ~10 segundos

# 3. Generar preguntas
# En el documento procesado, clic: "🤖 Generar Preguntas"
# Cantidad: 10
# Dificultad: Medio
# Esperar: ~30 segundos

# 4. Resultado
# ✅ 10 preguntas generadas
# ✅ Basadas en la Ley 39/2015
# ✅ Listas para revisar
```

---

## ⚙️ Configuración

### **Groq (Actual - Recomendado)**
- ✅ Ya configurado
- ✅ API Key válida
- ✅ 30 requests/minuto gratis
- ✅ Modelo: LLaMA 3.3 70B

### **Ollama (Alternativa Local)**
- ✅ Instalado y activo
- ✅ Modelo: llama3.2:3b
- ✅ 100% gratis y privado

Para cambiar a Ollama:
```typescript
// En el código, cambiar:
useOllama: true
```

---

## 📊 Comandos Útiles

```bash
# Ver estado del sistema
./scripts/test-ai.sh

# Actualizar base de datos
npx prisma db push

# Ver logs del servidor
# (En la terminal donde corre npm run dev)

# Reiniciar Ollama
brew services restart ollama

# Ver modelos Ollama
ollama list

# Descargar nuevo modelo
ollama pull llama3.2
```

---

## 🔍 Troubleshooting

### "Error al generar preguntas"
```bash
# Verificar API key
grep GROQ_API_KEY .env

# Probar conexión
./scripts/test-ai.sh
```

### "No hay documentos procesados"
```bash
# Verificar archivos
ls -la documentos-temario/general/
ls -la documentos-temario/especifico/
ls -la documentos-temario/biblioteca/

# Procesar manualmente
# http://localhost:3000/admin/ai-documents
# Clic: "⚡ Procesar Todos"
```

### "La IA no responde en el chat"
```bash
# 1. Verificar que hay documentos procesados
# 2. Verificar API key de Groq
# 3. Ver logs en consola del navegador
```

---

## 📈 Siguientes Pasos

1. **Procesar todo el temario**
   - Subir PDFs de todos los temas
   - Procesar con "⚡ Procesar Todos"

2. **Generar banco de preguntas**
   - 10-20 preguntas por tema
   - Revisar y aprobar

3. **Configurar para estudiantes**
   - Probar asistente de estudio
   - Ajustar respuestas según necesidad

4. **Monitorear uso**
   - Ver estadísticas en admin panel
   - Ajustar límites si es necesario

---

## 🎉 ¡Listo para Usar!

El sistema está **100% operativo**. Puedes empezar a:
- ✅ Procesar documentos
- ✅ Generar preguntas
- ✅ Usar el chat RAG
- ✅ Gestionar la biblioteca legal

**URL Admin**: http://localhost:3000/admin/ai-documents  
**URL Estudiantes**: http://localhost:3000/asistente-estudio

---

**Última actualización:** 28 de diciembre de 2025
