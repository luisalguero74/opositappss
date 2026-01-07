#!/bin/bash

# Script para configurar variables de LiveKit en Vercel

echo "🎥 Configurando LiveKit en Vercel..."
echo ""

# Leer variables del .env local
LIVEKIT_URL=$(grep "^LIVEKIT_URL=" .env | cut -d '=' -f2)
LIVEKIT_API_KEY=$(grep "^LIVEKIT_API_KEY=" .env | cut -d '=' -f2)
LIVEKIT_API_SECRET=$(grep "^LIVEKIT_API_SECRET=" .env | cut -d '=' -f2)

if [ -z "$LIVEKIT_URL" ] || [ -z "$LIVEKIT_API_KEY" ] || [ -z "$LIVEKIT_API_SECRET" ]; then
  echo "❌ Error: No se encontraron todas las variables de LiveKit en .env"
  echo ""
  echo "Asegúrate de que .env contenga:"
  echo "  LIVEKIT_URL=..."
  echo "  LIVEKIT_API_KEY=..."
  echo "  LIVEKIT_API_SECRET=..."
  exit 1
fi

echo "✓ Variables encontradas en .env:"
echo "  LIVEKIT_URL: $LIVEKIT_URL"
echo "  LIVEKIT_API_KEY: ${LIVEKIT_API_KEY:0:10}..."
echo "  LIVEKIT_API_SECRET: ${LIVEKIT_API_SECRET:0:10}..."
echo ""

# Configurar en Vercel
echo "📤 Subiendo variables a Vercel..."
echo ""

echo "$LIVEKIT_URL" | npx vercel env add LIVEKIT_URL production
echo "$LIVEKIT_API_KEY" | npx vercel env add LIVEKIT_API_KEY production  
echo "$LIVEKIT_API_SECRET" | npx vercel env add LIVEKIT_API_SECRET production

echo ""
echo "✅ Variables configuradas en Vercel"
echo ""
echo "🚀 Desplegando aplicación para aplicar cambios..."
npx vercel --prod --yes

echo ""
echo "✅ ¡Listo! Las aulas virtuales deberían funcionar ahora en producción."
echo ""
echo "🧪 Prueba:"
echo "  1. Crea un aula en: https://opositappss.vercel.app/admin"
echo "  2. Únete desde: https://opositappss.vercel.app/classrooms"
echo ""
