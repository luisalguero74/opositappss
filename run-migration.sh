#!/bin/bash
set -e

# Cargar DATABASE_URL desde .env.vercel.production
DB_URL=$(grep '^DATABASE_URL=' .env.vercel.production | sed 's/DATABASE_URL=//' | sed 's/"//g' | sed 's/\\n//g')

echo "📦 DATABASE_URL found: ${DB_URL:0:50}..."
echo "🚀 Running Prisma migration..."

# Ejecutar migración con DATABASE_URL
DATABASE_URL="$DB_URL" npx prisma migrate dev --name "add_admin_features"

echo "✅ Migration completed!"
