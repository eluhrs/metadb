#!/usr/bin/env bash
#
# dump-prod-db.sh — Full SQL backup of the metadb production database.
#
# Run this ON THE TANKER HOST (where docker-compose.prod.yml is deployed),
# BEFORE ingesting the new spreadsheet / pulling images, so you have a
# clean recovery point for the current state.
#
# It finds the running Postgres container by its Compose service label,
# then runs pg_dump *inside* the container reusing the POSTGRES_* env vars
# the container already has — so no credentials are hardcoded here.
#
# Usage:
#   ./scripts/dump-prod-db.sh                 # dump to ./backups/
#   OUTPUT_DIR=/opt/metadb/backups ./scripts/dump-prod-db.sh
#   CONTAINER=metadb-db-1 ./scripts/dump-prod-db.sh   # override auto-detect
#
set -euo pipefail

# --- Config (override via env vars) ------------------------------------------
OUTPUT_DIR="${OUTPUT_DIR:-./backups}"
# Compose labels used to auto-locate the prod db container.
COMPOSE_SERVICE="${COMPOSE_SERVICE:-db}"           # service name in docker-compose.prod.yml
COMPOSE_PROJECT="${COMPOSE_PROJECT:-}"              # optional: narrow to a project if several match
CONTAINER="${CONTAINER:-}"                          # optional: skip detection, name it directly

# --- Locate the database container -------------------------------------------
if [[ -z "$CONTAINER" ]]; then
  filters=(--filter "label=com.docker.compose.service=${COMPOSE_SERVICE}" --filter "status=running")
  if [[ -n "$COMPOSE_PROJECT" ]]; then
    filters+=(--filter "label=com.docker.compose.project=${COMPOSE_PROJECT}")
  fi
  mapfile -t matches < <(docker ps "${filters[@]}" --format '{{.Names}}')

  if [[ "${#matches[@]}" -eq 0 ]]; then
    echo "ERROR: No running Postgres container found (service='${COMPOSE_SERVICE}')." >&2
    echo "       Is the prod stack up?  Try:  docker ps" >&2
    echo "       Or set CONTAINER=<name> explicitly." >&2
    exit 1
  fi
  if [[ "${#matches[@]}" -gt 1 ]]; then
    echo "ERROR: Multiple db containers match; disambiguate with COMPOSE_PROJECT= or CONTAINER=" >&2
    printf '   - %s\n' "${matches[@]}" >&2
    exit 1
  fi
  CONTAINER="${matches[0]}"
fi

echo "==> Using container: ${CONTAINER}"

# Confirm it's actually running.
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "ERROR: Container '${CONTAINER}' is not running." >&2
  exit 1
fi

# --- Read db identity from the container (for the message + filename) --------
DB_NAME="$(docker exec "$CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo metadb_prod)"
DB_USER="$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo metadb_user)"

# --- Prepare output ----------------------------------------------------------
mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTFILE="${OUTPUT_DIR%/}/${DB_NAME}_${TIMESTAMP}.sql"

echo "==> Dumping database '${DB_NAME}' (user '${DB_USER}') ..."
echo "    -> ${OUTFILE}"

# --- Dump --------------------------------------------------------------------
# pg_dump runs inside the container. PGPASSWORD/POSTGRES_* already exist there.
# --clean --if-exists makes the dump safe to restore straight over an existing
# database. Plain SQL so you can inspect it and restore with psql.
if ! docker exec "$CONTAINER" sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
     -U "$POSTGRES_USER" \
     -d "$POSTGRES_DB" \
     --clean --if-exists \
     --no-owner --no-privileges' \
  > "$OUTFILE"; then
  echo "ERROR: pg_dump failed. Partial file left at ${OUTFILE} — inspect/delete it." >&2
  exit 1
fi

# --- Verify ------------------------------------------------------------------
if [[ ! -s "$OUTFILE" ]]; then
  echo "ERROR: Dump file is empty — something went wrong." >&2
  exit 1
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
echo "==> Done. Backup written (${SIZE}):"
echo "    ${OUTFILE}"
echo
echo "To restore this dump later (DESTRUCTIVE — overwrites current data):"
echo "    cat '${OUTFILE}' | docker exec -i ${CONTAINER} sh -c \\"
echo "        'PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\"'"
