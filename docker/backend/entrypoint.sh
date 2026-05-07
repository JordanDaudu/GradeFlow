#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Checking for existing users..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(function(n) { console.log(n); return p.\$disconnect(); })
  .catch(function(e) { console.error(e); p.\$disconnect(); process.exit(1); });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "[entrypoint] No users found — running secure first-boot seed..."
  node_modules/.bin/ts-node --transpile-only prisma/seed.ts
  echo "[entrypoint] Initial seed complete."
else
  echo "[entrypoint] Found $USER_COUNT user(s) — skipping seed."
fi

echo "[entrypoint] Starting application..."
if [ -f dist/main.js ]; then
  APP_ENTRY="dist/main.js"
elif [ -f dist/src/main.js ]; then
  APP_ENTRY="dist/src/main.js"
else
  echo "[entrypoint] Could not find compiled NestJS entrypoint."
  echo "[entrypoint] Available dist files:"
  find dist -maxdepth 5 -type f | sort || true
  exit 1
fi

echo "[entrypoint] Using entrypoint: $APP_ENTRY"
exec node --enable-source-maps "$APP_ENTRY"
