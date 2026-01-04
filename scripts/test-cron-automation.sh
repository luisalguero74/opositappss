#!/bin/bash

# 🧪 QUICK TEST SCRIPT - Prueba rápida del sistema de automatización
# Uso: bash scripts/test-cron-automation.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🧪 PRUEBA DE AUTOMATIZACIÓN CON CRON                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Verificar dependencias
echo -e "${YELLOW}[1/6] Verificando dependencias...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js encontrado: $(node --version)${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}✗ npx no está disponible${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npx disponible${NC}"

if ! command -v crontab &> /dev/null; then
    echo -e "${RED}✗ crontab no disponible (requerido para macOS)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ crontab disponible${NC}"
echo ""

# 2. Verificar variables de entorno
echo -e "${YELLOW}[2/6] Verificando variables de entorno...${NC}"

if [ -f .env ]; then
    echo -e "${GREEN}✓ Archivo .env encontrado${NC}"
    
    if grep -q "GROQ_API_KEY" .env; then
        echo -e "${GREEN}✓ GROQ_API_KEY configurada${NC}"
    else
        echo -e "${YELLOW}⚠ GROQ_API_KEY no encontrada en .env${NC}"
        echo "  Nota: Se requiere para generación real"
    fi
    
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✓ DATABASE_URL configurada${NC}"
    else
        echo -e "${RED}✗ DATABASE_URL no encontrada en .env${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Archivo .env no encontrado${NC}"
    exit 1
fi
echo ""

# 3. Verificar script de generación
echo -e "${YELLOW}[3/6] Verificando script de generación...${NC}"

if [ -f scripts/cron-generate-questions.ts ]; then
    echo -e "${GREEN}✓ Script cron-generate-questions.ts encontrado${NC}"
    # Contar líneas
    LINES=$(wc -l < scripts/cron-generate-questions.ts)
    echo -e "${GREEN}  Líneas: $LINES${NC}"
else
    echo -e "${RED}✗ Script cron-generate-questions.ts no encontrado${NC}"
    exit 1
fi

if [ -f scripts/setup-cron.sh ]; then
    echo -e "${GREEN}✓ Script setup-cron.sh encontrado${NC}"
else
    echo -e "${RED}✗ Script setup-cron.sh no encontrado${NC}"
    exit 1
fi
echo ""

# 4. Prueba: ejecutar script con --dry-run
echo -e "${YELLOW}[4/6] Ejecutando prueba en modo simulación (--dry-run)...${NC}"
echo -e "${BLUE}      Generando 3 preguntas para tema G1...${NC}"
echo ""

npx tsx scripts/cron-generate-questions.ts \
    --tema=G1 \
    --num-questions=3 \
    --dry-run \
    --log-file=./test-cron-log.txt

echo ""
echo -e "${GREEN}✓ Prueba de generación completada${NC}"
echo ""

# 5. Revisar log
echo -e "${YELLOW}[5/6] Contenido del log de prueba...${NC}"
if [ -f test-cron-log.txt ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    head -20 test-cron-log.txt
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Log de prueba no encontrado${NC}"
fi

# 6. Mostrar próximos pasos
echo -e "${YELLOW}[6/6] Próximos pasos...${NC}"
echo ""
echo -e "${GREEN}✓ Todo está listo para producción${NC}"
echo ""
echo -e "${BLUE}Para instalar cron automation, ejecuta:${NC}"
echo -e "${YELLOW}  bash scripts/setup-cron.sh install${NC}"
echo ""
echo -e "${BLUE}Para ver los trabajos cron instalados:${NC}"
echo -e "${YELLOW}  bash scripts/setup-cron.sh list${NC}"
echo ""
echo -e "${BLUE}Para monitorear ejecuciones:${NC}"
echo -e "${YELLOW}  tail -f logs/cron-generation.log${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ Prueba completada exitosamente                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
