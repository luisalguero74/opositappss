#!/bin/bash
# Script para exportar preguntas de local y subirlas a producción

echo "🔄 Exportando preguntas de base de datos local..."

# Exportar preguntas a CSV/SQL
npx prisma db execute --file export-questions.sql --stdin <<'SQL'
COPY (
  SELECT 
    id, "questionnaireId", text, options, "correctAnswer", 
    explanation, "temaCodigo", "temaNumero", "temaParte", 
    "temaTitulo", difficulty, "createdAt"
  FROM "Question"
  WHERE "temaCodigo" IS NOT NULL
) TO STDOUT WITH CSV HEADER;
SQL

echo "✅ Exportación completada"
echo ""
echo "⚠️  IMPORTANTE: Para importar a producción necesitas:"
echo "   1. Conectarte a la base de datos de Vercel"
echo "   2. Usar el comando COPY ... FROM para importar"
echo ""
echo "O puedes usar el generador bulk directamente en producción."
