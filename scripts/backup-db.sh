#!/usr/bin/env bash
set -euo pipefail

# Simple pg_dump backup using DATABASE_URL. Creates gzip file under ./backups
# Usage: npm run db:backup

: "${DATABASE_URL?Debe definir DATABASE_URL (p.ej: postgresql://user:pass@host:5432/db)}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILE="${BACKUP_DIR}/opositappss-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 Creando backup en ${FILE}"
pg_dump "${DATABASE_URL}" | gzip > "${FILE}"

SIZE=$(du -h "${FILE}" | cut -f1)
echo "✅ Backup completado (${SIZE})"
