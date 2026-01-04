#!/bin/bash

echo "🚀 Procesando Documentos Automáticamente..."
echo "============================================"
echo ""

# Función para procesar un documento
process_document() {
    local filepath=$1
    local filename=$(basename "$filepath")
    local category=$2
    local topic=$3
    
    echo "📄 Procesando: $filename"
    echo "   Categoría: $category"
    echo "   Tema: $topic"
    
    # Crear el payload JSON
    local payload=$(cat <<EOF
{
  "filePath": "$filepath",
  "fileName": "$filename",
  "type": "$category",
  "topic": "$topic"
}
EOF
)
    
    # Llamar a la API (asumiendo que estás logueado como admin)
    local response=$(curl -s -X POST http://localhost:3000/api/ai/process-document \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q '"success":true'; then
        local sections=$(echo "$response" | grep -o '"sections":[0-9]*' | grep -o '[0-9]*')
        local content_length=$(echo "$response" | grep -o '"contentLength":[0-9]*' | grep -o '[0-9]*')
        echo "   ✅ Procesado: $sections secciones, $content_length caracteres"
    else
        echo "   ❌ Error: $response"
    fi
    echo ""
}

# Contador
total=0
success=0

# Procesar documentos del temario general
echo "📚 TEMARIO GENERAL"
echo "=================="
echo ""

if [ -f "documentos-temario/general/tema1_constitucion.txt" ]; then
    process_document "documentos-temario/general/tema1_constitucion.txt" "temario_general" "Tema 1"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/tema2_organizacion_territorial.txt" ]; then
    process_document "documentos-temario/general/tema2_organizacion_territorial.txt" "temario_general" "Tema 2"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/Tema4_la Corona.txt" ]; then
    process_document "documentos-temario/general/Tema4_la Corona.txt" "temario_general" "Tema 4"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/tema5_El_Poder_legislativo.txt" ]; then
    process_document "documentos-temario/general/tema5_El_Poder_legislativo.txt" "temario_general" "Tema 5"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/tema6_El_Poder_Judicial.txt" ]; then
    process_document "documentos-temario/general/tema6_El_Poder_Judicial.txt" "temario_general" "Tema 6"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/tema7_El_poder_ejecutivo.txt" ]; then
    process_document "documentos-temario/general/tema7_El_poder_ejecutivo.txt" "temario_general" "Tema 7"
    total=$((total + 1))
fi

# Procesar algunos PDFs
if [ -f "documentos-temario/general/Tema 10  Las Instituciones de la Unión Europea.pdf" ]; then
    process_document "documentos-temario/general/Tema 10  Las Instituciones de la Unión Europea.pdf" "temario_general" "Tema 10"
    total=$((total + 1))
fi

if [ -f "documentos-temario/general/tema13_Las_fuentes_del_Derecho_Administrativo.pdf" ]; then
    process_document "documentos-temario/general/tema13_Las_fuentes_del_Derecho_Administrativo.pdf" "temario_general" "Tema 13"
    total=$((total + 1))
fi

# Procesar documentos del temario específico
echo "📘 TEMARIO ESPECÍFICO"
echo "===================="
echo ""

if [ -f "documentos-temario/especifico/tema2_prestaciones_ss.txt" ]; then
    process_document "documentos-temario/especifico/tema2_prestaciones_ss.txt" "temario_especifico" "Tema 25"
    total=$((total + 1))
fi

if [ -f "documentos-temario/especifico/Tema 03. AASS. Turno Libre. Temario Específico..txt" ]; then
    process_document "documentos-temario/especifico/Tema 03. AASS. Turno Libre. Temario Específico..txt" "temario_especifico" "Tema 26"
    total=$((total + 1))
fi

# Procesar documento de biblioteca
echo "⚖️  BIBLIOTECA LEGAL"
echo "==================="
echo ""

if [ -f "documentos-temario/biblioteca/CE_1978.txt" ]; then
    process_document "documentos-temario/biblioteca/CE_1978.txt" "ley" "Constitución Española"
    total=$((total + 1))
fi

echo ""
echo "============================================"
echo "📊 RESUMEN"
echo "============================================"
echo "Total documentos procesados: $total"
echo ""
echo "🎯 Siguiente paso:"
echo "   1. Ve a: http://localhost:3000/admin/ai-documents"
echo "   2. Verifica los documentos procesados"
echo "   3. Genera preguntas con: 🤖 Generar Preguntas"
echo ""
