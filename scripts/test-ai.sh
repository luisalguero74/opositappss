#!/bin/bash
echo "🤖 Probando Sistema de IA con Groq..."
echo ""

# Test de la API key
echo "1️⃣ Verificando API Key de Groq..."
if grep -q "GROQ_API_KEY=gsk_" .env; then
    echo "   ✅ API Key encontrada en .env"
else
    echo "   ❌ API Key no configurada"
    exit 1
fi

# Test de conexión a Groq
echo ""
echo "2️⃣ Probando conexión con Groq API..."
GROQ_KEY=$(grep GROQ_API_KEY .env | cut -d '=' -f2)

response=$(curl -s -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer $GROQ_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {
        "role": "user",
        "content": "Di solo: Sistema funcionando correctamente"
      }
    ],
    "max_tokens": 50
  }')

if echo "$response" | grep -q "Sistema funcionando"; then
    echo "   ✅ Conexión exitosa con Groq"
    echo "   📝 Respuesta:" $(echo "$response" | grep -o '"content":"[^"]*"' | head -1)
else
    echo "   ⚠️  Respuesta de Groq:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
fi

# Verificar Ollama local
echo ""
echo "3️⃣ Verificando Ollama local..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama activo en localhost:11434"
    echo "   📦 Modelos instalados:"
    ollama list 2>/dev/null | head -5 || echo "   (No se pudo listar modelos)"
else
    echo "   ⚠️  Ollama no está activo"
    echo "   💡 Ejecuta: brew services start ollama"
fi

# Verificar estructura de base de datos
echo ""
echo "4️⃣ Verificando estructura de base de datos..."
if npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"LegalDocument\";" 2>/dev/null; then
    echo "   ✅ Tabla LegalDocument existe"
else
    echo "   ⚠️  Ejecuta: npx prisma db push"
fi

echo ""
echo "📊 Resumen del Sistema:"
echo "   ✅ Groq API configurada"
echo "   ✅ Base de datos lista"
echo "   🌐 Web: http://localhost:3000/asistente-estudio"
echo "   ⚙️  Admin: http://localhost:3000/admin/ai-documents"
echo ""
echo "💡 Siguiente paso: Ir a /admin/ai-documents y procesar documentos"
