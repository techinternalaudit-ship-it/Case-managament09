#!/bin/sh
set -e

echo "Pushing database schema..."
node node_modules/prisma/build/index.js db push --skip-generate

echo "Seeding database (if needed)..."
node node_modules/prisma/build/index.js db seed 2>/dev/null || echo "Seed skipped or already done"

echo "Starting application..."
exec node server.js
