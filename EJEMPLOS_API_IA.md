# 🧪 Ejemplos de Uso de la API de IA

## 📝 Endpoints Disponibles

### 1. **Procesar Documento**
```http
POST /api/ai/process-document
Content-Type: application/json

{
  "filePath": "documentos-temario/general/tema1_constitucion.txt",
  "fileName": "tema1_constitucion.txt",
  "type": "temario_general",
  "topic": "Tema 1",
  "reference": null
}
```

**Respuesta:**
```json
{
  "success": true,
  "document": {
    "id": "clx...",
    "title": "tema1_constitucion",
    "sections": 42,
    "contentLength": 15432
  }
}
```

---

### 2. **Generar Preguntas**
```http
POST /api/ai/generate-questions
Content-Type: application/json

{
  "documentId": "clx...",
  "count": 10,
  "difficulty": "medium",
  "useOllama": false
}
```

**Respuesta:**
```json
{
  "success": true,
  "count": 10,
  "questions": [
    {
      "id": "clx...",
      "text": "¿Qué establece el artículo 14 de la Constitución Española?",
      "options": "[\"Igualdad ante la ley\",\"Libertad de expresión\",\"Derecho al voto\",\"Propiedad privada\"]",
      "correctAnswer": "A",
      "explanation": "El artículo 14 establece que todos los españoles son iguales ante la ley...",
      "difficulty": "medium",
      "topic": "Tema 1"
    }
  ]
}
```

---

### 3. **Chat RAG**
```http
POST /api/ai/chat
Content-Type: application/json

{
  "query": "¿Qué dice el artículo 14 de la Constitución?",
  "conversationHistory": [],
  "topic": "Tema 1",
  "action": "chat"
}
```

**Respuesta:**
```json
{
  "success": true,
  "response": "El artículo 14 de la Constitución Española establece que todos los españoles son iguales ante la ley, sin que pueda prevalecer discriminación alguna por razón de nacimiento, raza, sexo, religión, opinión o cualquier otra condición o circunstancia personal o social.",
  "sources": [
    {
      "documentId": "clx...",
      "title": "Constitución Española - Tema 1",
      "relevanceScore": 95
    }
  ]
}
```

---

### 4. **Procesamiento Masivo**
```http
POST /api/ai/batch-process
Content-Type: application/json

{
  "action": "process-all"
}
```

**Respuesta:**
```json
{
  "success": true,
  "results": {
    "processed": 25,
    "failed": 2,
    "errors": [
      "tema5.pdf: Error al procesar PDF",
      "tema12.doc: Formato no soportado"
    ]
  }
}
```

---

## 🔧 Uso con cURL

### Procesar un documento
```bash
curl -X POST http://localhost:3000/api/ai/process-document \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "filePath": "documentos-temario/general/tema1_constitucion.txt",
    "fileName": "tema1_constitucion.txt",
    "type": "temario_general",
    "topic": "Tema 1"
  }'
```

### Generar preguntas
```bash
curl -X POST http://localhost:3000/api/ai/generate-questions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "documentId": "clx123...",
    "count": 5,
    "difficulty": "medium",
    "useOllama": false
  }'
```

### Chat RAG
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "query": "Explícame el artículo 14",
    "topic": "Tema 1",
    "action": "explain"
  }'
```

---

## 🐛 Uso con JavaScript/TypeScript

### En un componente de React
```typescript
// Generar preguntas
async function generateQuestions(documentId: string) {
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      count: 10,
      difficulty: 'medium',
      useOllama: false
    })
  })

  const data = await res.json()
  
  if (data.success) {
    console.log(`✅ ${data.count} preguntas generadas`)
    return data.questions
  } else {
    throw new Error(data.error)
  }
}

// Chat RAG
async function askAI(question: string, topic?: string) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      topic,
      action: 'chat'
    })
  })

  const data = await res.json()
  
  return {
    answer: data.response,
    sources: data.sources
  }
}
```

---

## 🎨 Uso en Scripts Node.js

```javascript
// scripts/generate-questions-bulk.js
const fetch = require('node-fetch')

async function generateQuestionsForAllTopics() {
  // 1. Obtener todos los documentos
  const docsRes = await fetch('http://localhost:3000/api/ai/process-document')
  const { documents } = await docsRes.json()

  // 2. Generar preguntas para cada documento
  for (const doc of documents) {
    console.log(`Generando preguntas para: ${doc.title}`)
    
    const questionsRes = await fetch('http://localhost:3000/api/ai/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: doc.id,
        count: 10,
        difficulty: 'medium'
      })
    })

    const { count } = await questionsRes.json()
    console.log(`✅ ${count} preguntas generadas`)
    
    // Esperar un poco entre requests para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('🎉 ¡Completado!')
}

generateQuestionsForAllTopics()
```

---

## 📚 Casos de Uso Reales

### 1. Procesar todo el temario al inicio
```bash
# Una sola vez al configurar el sistema
curl -X POST http://localhost:3000/api/ai/batch-process \
  -H "Content-Type: application/json" \
  -d '{"action": "process-all"}'
```

### 2. Generar banco de preguntas semanal
```javascript
// Automatizar generación cada semana
cron.schedule('0 0 * * 0', async () => {
  // Generar 5 preguntas nuevas por tema
  for (const doc of documents) {
    await generateQuestions(doc.id, 5, 'medium')
  }
})
```

### 3. Chat interactivo en tiempo real
```typescript
// WebSocket para chat en tiempo real
const [messages, setMessages] = useState([])

async function sendMessage(query: string) {
  const response = await askAI(query, currentTopic)
  
  setMessages(prev => [
    ...prev,
    { role: 'user', content: query },
    { role: 'assistant', content: response.answer, sources: response.sources }
  ])
}
```

---

## ⚡ Tips de Optimización

### 1. **Cachear respuestas frecuentes**
```typescript
const cache = new Map()

async function askAIWithCache(query: string) {
  if (cache.has(query)) {
    return cache.get(query)
  }

  const response = await askAI(query)
  cache.set(query, response)
  return response
}
```

### 2. **Batch processing en paralelo**
```typescript
// Procesar múltiples documentos en paralelo
await Promise.all(
  documents.map(doc => 
    processDocument(doc.filePath, doc.fileName)
  )
)
```

### 3. **Rate limiting**
```typescript
// Limitar requests a Groq (30/min)
const rateLimiter = new RateLimiter(30, 60000)

await rateLimiter.wait()
const questions = await generateQuestions(docId)
```

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación admin excepto `/api/ai/chat` que requiere usuario autenticado.

```typescript
// Obtener session token
const session = await getServerSession(authOptions)
if (!session || session.user?.role !== 'admin') {
  return res.status(401).json({ error: 'No autorizado' })
}
```

---

**Documentación completa:** Ver [SISTEMA_IA_COMPLETO.md](./SISTEMA_IA_COMPLETO.md)
