#!/bin/bash

################################################################################
# Script de Configuración de Cron - Generación Automática de Preguntas
#
# Este script configura trabajos cron para generar preguntas automáticamente
# según horarios predefinidos.
#
# Uso:
#   bash scripts/setup-cron.sh [opción]
#
# Opciones:
#   install          Instalar/configurar trabajos cron
#   remove           Desinstalar todos los trabajos cron
#   list             Listar trabajos cron configurados
#   test             Ejecutar una prueba del script
#
################################################################################

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_DIR/scripts/cron-generate-questions.ts"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/cron-generation.log"
NODE_BIN=$(which node)
NPXBCMD="$NODE_BIN -r tsx/esm"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# FUNCIONES AUXILIARES
# ============================================

print_header() {
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}================================${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================
# INSTALACIÓN DE CRON
# ============================================

install_cron() {
  print_header "Instalando Trabajos Cron"

  # Crear directorio de logs
  if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    print_success "Directorio de logs creado: $LOG_DIR"
  fi

  # Crear archivo crontab temporal
  CRON_TEMP=$(mktemp)
  
  # Obtener crontab actual (si existe)
  crontab -l > "$CRON_TEMP" 2>/dev/null || true

  # Verificar que no existe ya
  if grep -q "cron-generate-questions.ts" "$CRON_TEMP"; then
    print_warning "Los trabajos cron ya están configurados"
    rm "$CRON_TEMP"
    return
  fi

  # Agregar nuevos trabajos cron
  print_info "Configurando trabajos cron..."

  cat >> "$CRON_TEMP" << 'EOF'

# ============================================
# GENERACIÓN AUTOMÁTICA DE PREGUNTAS
# ============================================

# Diariamente a las 2:00 AM - Generar preguntas para temas generales
0 2 * * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --general-only >> logs/cron-generation.log 2>&1

# Cada lunes a las 4:00 AM - Generar preguntas para temas específicos
0 4 * * 1 cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --specific-only >> logs/cron-generation.log 2>&1

# Cada primer día del mes a las 3:00 AM - Generación completa
0 3 1 * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --all >> logs/cron-generation.log 2>&1

EOF

  # Instalar nuevo crontab
  crontab "$CRON_TEMP"
  rm "$CRON_TEMP"

  print_success "Trabajos cron instalados correctamente"
  print_info "Configuración:"
  print_info "  - Diario (2:00 AM): Temario general"
  print_info "  - Cada lunes (4:00 AM): Temario específico"
  print_info "  - Mensual (3:00 AM del 1): Completo"
  print_info "Logs: $LOG_FILE"
}

# ============================================
# DESINSTALACIÓN DE CRON
# ============================================

remove_cron() {
  print_header "Desinstalando Trabajos Cron"

  # Crear archivo crontab temporal
  CRON_TEMP=$(mktemp)
  
  # Obtener crontab actual
  crontab -l > "$CRON_TEMP" 2>/dev/null || true

  # Verificar que existen
  if ! grep -q "cron-generate-questions.ts" "$CRON_TEMP"; then
    print_warning "No hay trabajos cron para desinstalar"
    rm "$CRON_TEMP"
    return
  fi

  # Eliminar líneas de cron
  grep -v "cron-generate-questions.ts" "$CRON_TEMP" > "$CRON_TEMP.new" || true
  grep -v "GENERACIÓN AUTOMÁTICA DE PREGUNTAS" "$CRON_TEMP.new" > "$CRON_TEMP" || true

  # Instalar crontab actualizado
  crontab "$CRON_TEMP"
  rm "$CRON_TEMP" "$CRON_TEMP.new"

  print_success "Trabajos cron desinstalados"
}

# ============================================
# LISTAR TRABAJOS CRON
# ============================================

list_cron() {
  print_header "Trabajos Cron Configurados"

  CRON_TEMP=$(mktemp)
  crontab -l > "$CRON_TEMP" 2>/dev/null || true

  if grep -q "cron-generate-questions.ts" "$CRON_TEMP"; then
    echo ""
    echo "📋 Trabajos de Generación de Preguntas:"
    echo ""
    grep -A 2 "GENERACIÓN AUTOMÁTICA" "$CRON_TEMP" || echo "No se encontró configuración"
    echo ""
    grep "cron-generate-questions.ts" "$CRON_TEMP" || echo "No se encontraron trabajos"
  else
    print_warning "No hay trabajos cron configurados"
  fi

  rm "$CRON_TEMP"
}

# ============================================
# PRUEBA DEL SCRIPT
# ============================================

test_script() {
  print_header "Probando Script de Generación"

  print_info "Ejecutando en modo DRY RUN..."
  print_info "(esto simulará sin guardar en la BD)"
  echo ""

  if [ ! -f "$SCRIPT_PATH" ]; then
    print_error "Script no encontrado: $SCRIPT_PATH"
    exit 1
  fi

  # Ejecutar con dry-run
  cd "$PROJECT_DIR"
  npx tsx "$SCRIPT_PATH" --num-questions=5 --dry-run --tema=G1

  print_success "Prueba completada"
  print_info "Log guardado en: $LOG_FILE"
}

# ============================================
# MENÚ PRINCIPAL
# ============================================

main() {
  if [ $# -eq 0 ]; then
    print_header "Utilidad de Configuración de Cron"
    echo ""
    echo "Opciones disponibles:"
    echo ""
    echo "  install  - Instalar trabajos cron"
    echo "  remove   - Desinstalar trabajos cron"
    echo "  list     - Listar trabajos cron"
    echo "  test     - Probar script (dry-run)"
    echo ""
    echo "Uso: bash scripts/setup-cron.sh [opción]"
    echo ""
    exit 0
  fi

  case "$1" in
    install)
      install_cron
      ;;
    remove)
      remove_cron
      ;;
    list)
      list_cron
      ;;
    test)
      test_script
      ;;
    *)
      print_error "Opción desconocida: $1"
      echo "Opciones válidas: install, remove, list, test"
      exit 1
      ;;
  esac
}

# Ejecutar
main "$@"
