#!/usr/bin/env bash
#
# Pull the latest code and redeploy. Run on the server from the repo root:
#   bash deploy/update.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "→ Pulling latest…"
git pull

echo "→ Installing deps…"
npm ci

echo "→ Applying migrations…"
npx prisma migrate deploy

echo "→ Building…"
npm run build

echo "→ Reloading PM2…"
pm2 reload qkazi

echo "✓ Updated."
