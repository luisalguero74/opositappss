#!/bin/bash
# Script de verificación de deployment - Todas las nuevas rutas del 19 feb 2026

echo "🔍 Verificando rutas creadas hoy (19 feb 2026)..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0

echo "📊 1. Verificando Dashboard de Salud del Banco..."
if [ -f "app/admin/banco-status/page.tsx" ]; then
    echo -e "${GREEN}✓${NC} Página existe: app/admin/banco-status/page.tsx"
else
    echo -e "${RED}✗${NC} Página NO existe: app/admin/banco-status/page.tsx"
    ((ERRORS++))
fi

if [ -f "app/api/admin/banco-status/route.ts" ]; then
    echo -e "${GREEN}✓${NC} API existe: app/api/admin/banco-status/route.ts"
else
    echo -e "${RED}✗${NC} API NO existe: app/api/admin/banco-status/route.ts"
    ((ERRORS++))
fi

echo ""
echo "🔍 2. Verificando Detector de Duplicados..."
if [ -f "app/admin/duplicates/page.tsx" ]; then
    echo -e "${GREEN}✓${NC} Página existe: app/admin/duplicates/page.tsx"
else
    echo -e "${RED}✗${NC} Página NO existe: app/admin/duplicates/page.tsx"
    ((ERRORS++))
fi

if [ -f "app/api/admin/detect-duplicates/route.ts" ]; then
    echo -e "${GREEN}✓${NC} API existe: app/api/admin/detect-duplicates/route.ts"
else
    echo -e "${RED}✗${NC} API NO existe: app/api/admin/detect-duplicates/route.ts"
    ((ERRORS++))
fi

echo ""
echo "🤖 3. Verificando Clasificador Automático..."
if [ -f "app/api/admin/auto-classify/route.ts" ]; then
    echo -e "${GREEN}✓${NC} API existe: app/api/admin/auto-classify/route.ts"
else
    echo -e "${RED}✗${NC} API NO existe: app/api/admin/auto-classify/route.ts"
    ((ERRORS++))
fi

echo ""
echo "📝 4. Verificando modificaciones en pages existentes..."
if grep -q "Auto-Clasificar" "app/admin/questions-sin-tema/page.tsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Botón Auto-Clasificar añadido en questions-sin-tema"
else
    echo -e "${YELLOW}⚠${NC} Botón Auto-Clasificar no encontrado (puede estar en otra línea)"
fi

if grep -q "banco-status" "app/admin/page.tsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Tarjeta Dashboard añadida en admin"
else
    echo -e "${RED}✗${NC} Tarjeta Dashboard NO encontrada en admin"
    ((ERRORS++))
fi

if grep -q "duplicates" "app/admin/page.tsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Tarjeta Duplicados añadida en admin"
else
    echo -e "${RED}✗${NC} Tarjeta Duplicados NO encontrada en admin"
    ((ERRORS++))
fi

echo ""
echo "🔧 5. Verificando dependencias necesarias..."
if grep -q "lucide-react" "package.json"; then
    echo -e "${GREEN}✓${NC} lucide-react instalado"
else
    echo -e "${RED}✗${NC} lucide-react NO instalado"
    ((ERRORS++))
fi

if grep -q "groq-sdk" "package.json"; then
    echo -e "${GREEN}✓${NC} groq-sdk instalado"
else
    echo -e "${YELLOW}⚠${NC} groq-sdk no encontrado (puede usar openai compatible)"
fi

echo ""
echo "🌍 6. Verificando variables de entorno..."
if grep -q "GROQ_API_KEY" ".env.local" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} GROQ_API_KEY configurada localmente"
else
    echo -e "${RED}✗${NC} GROQ_API_KEY NO encontrada en .env.local"
    ((ERRORS++))
fi

echo ""
echo "📦 7. Ejecutando build de prueba..."
npm run build > /tmp/build-test.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build exitoso"
    echo ""
    echo "Páginas generadas:"
    grep -E "○|ƒ" /tmp/build-test.log | grep -E "banco-status|duplicates|questions-sin-tema" | head -5
else
    echo -e "${RED}✗${NC} Build FALLÓ"
    echo ""
    echo "Errores encontrados:"
    grep -i "error" /tmp/build-test.log | head -10
    ((ERRORS++))
fi

echo ""
echo "📋 8. Verificando commits del día..."
COMMITS_TODAY=$(git log --oneline --since="2026-02-19 00:00:00" 2>/dev/null | wc -l)
echo "Commits realizados hoy: $COMMITS_TODAY"
if [ $COMMITS_TODAY -ge 2 ]; then
    echo -e "${GREEN}✓${NC} Múltiples commits (desarrollo activo)"
    git log --oneline --since="2026-02-19 00:00:00" | head -5
else
    echo -e "${YELLOW}⚠${NC} Pocos commits hoy"
fi

echo ""
echo "═══════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ TODO CORRECTO - Sin errores detectados${NC}"
    echo ""
    echo "🚀 El proyecto está listo para deployment en Vercel"
    echo ""
    echo "Variables de entorno necesarias en Vercel:"
    echo "  - DATABASE_URL"
    echo "  - NEXTAUTH_SECRET"
    echo "  - GROQ_API_KEY ⚠️  IMPORTANTE: Verificar que esté configurada"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ERRORES ENCONTRADOS: $ERRORS${NC}"
    echo ""
    echo "Por favor, revisa los errores arriba antes de deployar."
    exit 1
fi
