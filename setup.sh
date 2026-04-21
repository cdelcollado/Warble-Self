#!/usr/bin/env bash
set -euo pipefail

# ── Checks ────────────────────────────────────────────────────────────────────

if [ ! -f ".env.example" ]; then
  echo "Error: .env.example not found. Run this script from the Warble-Self root directory." >&2
  exit 1
fi

if ! command -v openssl &>/dev/null; then
  echo "Error: openssl is required but not installed." >&2
  exit 1
fi

if [ -f ".env" ]; then
  echo ".env already exists. Remove it first if you want to regenerate secrets."
  exit 0
fi

# ── Generate secrets ──────────────────────────────────────────────────────────

POSTGRES_PASSWORD=$(openssl rand -hex 32)
MINIO_ACCESS_KEY=$(openssl rand -hex 8)
MINIO_SECRET_KEY=$(openssl rand -base64 32)
ADMIN_SECRET=$(openssl rand -base64 32)

# ── Write .env ────────────────────────────────────────────────────────────────

sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
  -e "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}|" \
  -e "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=${MINIO_SECRET_KEY}|" \
  -e "s|^ADMIN_SECRET=.*|ADMIN_SECRET=${ADMIN_SECRET}|" \
  .env.example > .env

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "✓ .env created with auto-generated secrets."
echo ""
echo "  POSTGRES_PASSWORD  → generated"
echo "  MINIO_ACCESS_KEY   → generated"
echo "  MINIO_SECRET_KEY   → generated"
echo "  ADMIN_SECRET       → generated"
echo ""
echo "  DOMAIN             → localhost  (change for production)"
echo "  FRONTEND_URL       → http://localhost  (change for production)"
echo ""
echo "For production with a real domain, edit .env and set:"
echo "  DOMAIN=your.domain.com"
echo "  FRONTEND_URL=https://your.domain.com"
echo ""
echo "Then run: docker compose up --build -d"
