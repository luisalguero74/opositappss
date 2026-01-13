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

# Prefer a pg_dump version compatible with Supabase (currently Postgres 17.x).
# You can override via PG_DUMP_BIN=/path/to/pg_dump.
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
if command -v brew >/dev/null 2>&1; then
	CELLAR="$(brew --cellar postgresql@17 2>/dev/null || true)"
	if [[ -n "${CELLAR}" ]]; then
		CANDIDATE="$(ls -1d "${CELLAR}"/*/bin/pg_dump 2>/dev/null | sort | tail -n1 || true)"
		if [[ -n "${CANDIDATE}" && -x "${CANDIDATE}" ]]; then
			PG_DUMP_BIN="${CANDIDATE}"
		fi
	fi
fi

echo "🔧 Usando pg_dump: ${PG_DUMP_BIN} ($(${PG_DUMP_BIN} --version 2>/dev/null | head -n1 || echo 'version desconocida'))"

# Prisma/Supabase often use PgBouncer-specific query params that pg_dump rejects.
# Strip known non-libpq params before dumping.
DUMP_URL="${DATABASE_URL}"
if [[ "${DUMP_URL}" == postgresql://* || "${DUMP_URL}" == postgres://* ]]; then
	DUMP_URL="$(DUMP_URL="${DUMP_URL}" node -e 'try { const u=new URL(process.env.DUMP_URL); u.searchParams.delete("pgbouncer"); u.searchParams.delete("statement_cache_size"); process.stdout.write(u.toString()); } catch { process.stdout.write(process.env.DUMP_URL || ""); }' 2>/dev/null)"
fi

"${PG_DUMP_BIN}" "${DUMP_URL}" | gzip > "${FILE}"

SIZE=$(du -h "${FILE}" | cut -f1)
echo "✅ Backup completado (${SIZE})"
