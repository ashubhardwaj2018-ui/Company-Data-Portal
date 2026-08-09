#!/bin/bash
set -e

npm install --legacy-peer-deps
npx drizzle-kit push --force

# Typecheck: catch missing imports / broken pages before anyone opens the app
echo "Running typecheck (npx tsc --noEmit)..."
if ! npx tsc --noEmit; then
  echo "ERROR: Typecheck failed — fix the type errors above before shipping." >&2
  exit 1
fi
echo "Typecheck passed."
