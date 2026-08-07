#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --legacy-peer-deps

echo "[post-merge] Pushing DB schema..."
npx drizzle-kit push --force 2>/dev/null || true

echo "[post-merge] Done."
