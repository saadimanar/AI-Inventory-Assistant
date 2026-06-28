#!/usr/bin/env bash
#
# Restructure AI-Personal-Assistant into a frontend/ + backend/ monorepo.
# Uses `git mv` so file history is preserved.
#
# Usage (from repo root):
#   chmod +x scripts/restructure-monorepo.sh
#   ./scripts/restructure-monorepo.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository." >&2
  exit 1
fi

if [[ "${1:-}" != "-y" && -n "$(git status --porcelain)" ]]; then
  echo "Warning: working tree has uncommitted changes."
  echo "Commit or stash them before running this script for a clean migration."
  read -r -p "Continue anyway? [y/N] " reply
  reply="$(printf '%s' "$reply" | tr '[:upper:]' '[:lower:]')"
  [[ "$reply" == "y" ]] || exit 1
fi

echo "==> Creating monorepo directories"
mkdir -p frontend backend/migrations

echo "==> Moving frontend (Next.js)"
for path in \
  app \
  components \
  lib \
  utils \
  middleware.ts \
  package.json \
  package-lock.json \
  next.config.ts \
  tsconfig.json \
  postcss.config.mjs \
  eslint.config.mjs \
  components.json \
  Dockerfile \
  .dockerignore
do
  if [[ -e "$path" ]]; then
    git mv "$path" "frontend/$path"
  else
    echo "  skip (missing): $path"
  fi
done

echo "==> Moving backend (Python API, formerly search-service/)"
if [[ -d search-service ]]; then
  for path in main.py auth.py chat_search.py opensearch_hybrid.py requirements.txt; do
    if [[ -f "search-service/$path" ]]; then
      git mv "search-service/$path" "backend/$path"
    fi
  done
  if [[ -f search-service/Dockerfile ]]; then
    git rm -f search-service/Dockerfile
  fi
  if [[ -d search-service ]]; then
    rmdir search-service 2>/dev/null || {
      remaining="$(find search-service -mindepth 1 -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')"
      if [[ "$remaining" != "0" ]]; then
        echo "  Warning: search-service/ is not empty; review manually:"
        ls -la search-service
      fi
    }
  fi
else
  echo "  skip: search-service/ not found (already migrated?)"
fi

echo "==> Moving SQL migrations to backend/migrations/"
for path in supabase-migration.sql supabase-chat-search-migration.sql; do
  if [[ -f "$path" ]]; then
    git mv "$path" "backend/migrations/$path"
  fi
done

echo "==> Patching docker-compose.yml paths"
if [[ -f docker-compose.yml ]]; then
  sed -i.bak \
    -e 's|context: ./search-service|context: ./backend|g' \
    -e 's|^  search-service:|  api:|g' \
    -e 's|- search-service|- api|g' \
    -e 's|context: \.$|context: ./frontend|g' \
    docker-compose.yml
  rm -f docker-compose.yml.bak
fi

echo "==> Appending monorepo paths to .gitignore"
GITIGNORE_BLOCK="
# Monorepo — frontend
frontend/node_modules/
frontend/.next/
frontend/out/
frontend/.vercel/

# Monorepo — backend
backend/__pycache__/
backend/.venv/
backend/.pytest_cache/
backend/.mypy_cache/
"
if ! grep -q "Monorepo — frontend" .gitignore 2>/dev/null; then
  printf '%s\n' "$GITIGNORE_BLOCK" >> .gitignore
fi

echo "==> Adding gunicorn to backend requirements (production Dockerfile)"
if [[ -f backend/requirements.txt ]] && ! grep -q '^gunicorn' backend/requirements.txt; then
  echo "gunicorn" >> backend/requirements.txt
fi

cat <<'EOF'

Migration complete.

Next steps:
  1. Review: git status && git diff
  2. Update README.md paths (frontend/, backend/, docker-compose service names)
  3. Vercel: set Root Directory to "frontend"
  4. AWS: build from backend/ — docker build -t inventory-api ./backend
  5. Local dev:
       docker compose up --build
       cd frontend && npm install && npm run dev
  6. Commit: git add -A && git commit -m "chore: restructure into frontend/backend monorepo"

EOF
