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
  echo "[entrypoint] No users found — running seed..."
  node_modules/.bin/ts-node --transpile-only prisma/seed.ts
  echo "[entrypoint] ============================================"
  echo "[entrypoint] Default credentials created:"
  echo "[entrypoint]   Admin    : admin@gradeflow.app    / admin123"
  echo "[entrypoint]   Lecturer : lecturer@gradeflow.app / lecturer123"
  echo "[entrypoint]   Grader   : grader@gradeflow.app   / grader123"
  echo "[entrypoint] Change these passwords after first login!"
  echo "[entrypoint] ============================================"
else
  echo "[entrypoint] Found $USER_COUNT user(s) — skipping seed."
fi

echo "[entrypoint] Starting application..."
exec node --enable-source-maps dist/main.js
