#!/bin/bash

set -e

APP_DIR="/var/www/AddressBay"
BRANCH="main"
PM2_APP="addressbay"

echo "=========================================="
echo " AddressBay Production Deployment"
echo "=========================================="
echo "Started: $(date)"
echo

cd "$APP_DIR"

echo "[1/7] Checking working tree..."

if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Working tree is not clean."
    echo
    git status
    echo
    echo "Deployment stopped to protect local VPS changes."
    exit 1
fi

echo "Working tree clean."
echo

echo "[2/7] Fetching GitHub..."

git fetch origin "$BRANCH"

echo
echo "[3/7] Checking for new commits..."

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "Already up to date."
else
    echo "Updating $LOCAL -> $REMOTE"
    git pull --ff-only origin "$BRANCH"
fi

echo

echo "[4/7] Installing dependencies..."

pnpm install --frozen-lockfile

echo

echo "[5/7] Building application..."

pnpm run build

echo

echo "[6/7] Restarting PM2..."

if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
else
    echo "ERROR: PM2 application '$PM2_APP' was not found."
    echo "Run 'pm2 list' and update PM2_APP in deploy.sh if necessary."
    exit 1
fi

echo

echo "[7/7] Saving PM2 process list..."

pm2 save

echo
echo "=========================================="
echo " Deployment successful"
echo "=========================================="
echo "Commit: $(git rev-parse --short HEAD)"
echo "Time:   $(date)"
echo
pm2 status
