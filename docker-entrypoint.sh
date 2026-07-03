#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --skip-generate

echo "Seeding database (if needed)..."
npx prisma db seed 2>/dev/null || echo "Seed skipped or already done"

echo "Starting application..."
exec node server.js
