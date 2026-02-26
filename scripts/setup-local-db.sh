#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_FILE="$ROOT_DIR/db/schema.sql"
WRITE_ENV=false

if [[ "${1:-}" == "--write-env" ]]; then
  WRITE_ENV=true
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

if [[ -x "/Applications/Postgres.app/Contents/Versions/latest/bin/psql" ]]; then
  PSQL_BIN="/Applications/Postgres.app/Contents/Versions/latest/bin/psql"
elif command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
else
  echo "psql not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-mitravel}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_NAME="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log((u.pathname||'/').replace(/^\\//,''));")"
  DB_HOST="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname||'127.0.0.1');")"
  DB_PORT="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.port||'5432');")"
  DB_USER="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(decodeURIComponent(u.username||'postgres'));")"
  DB_PASSWORD="$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(decodeURIComponent(u.password||'postgres'));")"
fi

if [[ ! "$DB_NAME" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "Invalid DB name '$DB_NAME'. Use only letters, numbers, underscore." >&2
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
ADMIN_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres"

DB_EXISTS="$("$PSQL_BIN" "$ADMIN_URL" -tA -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}' LIMIT 1;")"
if [[ "$DB_EXISTS" != "1" ]]; then
  echo "Creating database '$DB_NAME'..."
  "$PSQL_BIN" "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\";"
else
  echo "Database '$DB_NAME' already exists."
fi

echo "Applying schema..."
"$PSQL_BIN" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

if [[ "$WRITE_ENV" == true ]]; then
  ENV_FILE="$ROOT_DIR/.env"
  if [[ ! -f "$ENV_FILE" ]]; then
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=$DATABASE_URL
EOF
    echo "Created .env with DATABASE_URL."
  else
    echo ".env already exists; not overwritten."
  fi
fi

echo "Done. DATABASE_URL=$DATABASE_URL"
