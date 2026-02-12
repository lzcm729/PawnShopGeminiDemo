#!/usr/bin/env bash
# Deploy Pawn's Dilemma to web server
# Usage: bash deploy.sh [server] [user] [remote_path]

set -euo pipefail

SERVER="${1:-124.222.217.9}"
USER="${2:-ubuntu}"
REMOTE_PATH="${3:-/var/www/game/pawnshop}"
PROJECT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"

echo "=== Deploy Pawn's Dilemma ==="
echo "Server: $USER@$SERVER:$REMOTE_PATH"
echo "Project: $PROJECT_DIR"
echo ""

# Step 1: Clean and build
echo "[1/4] Building..."
rm -rf "$DIST_DIR"
node "$PROJECT_DIR/node_modules/vite/bin/vite.js" build --config "$PROJECT_DIR/vite.config.ts"
echo ""

# Step 2: Upload to temp dir
echo "[2/4] Uploading to server..."
ssh "$USER@$SERVER" "rm -rf /tmp/pawnshop-deploy && mkdir -p /tmp/pawnshop-deploy"
scp -r "$DIST_DIR"/* "$USER@$SERVER":/tmp/pawnshop-deploy/

# Step 3: Atomic swap on server
echo "[3/4] Deploying..."
ssh "$USER@$SERVER" "
  sudo rm -rf ${REMOTE_PATH}/*
  sudo cp -r /tmp/pawnshop-deploy/* ${REMOTE_PATH}/
  sudo chown -R www-data:www-data ${REMOTE_PATH}/
  rm -rf /tmp/pawnshop-deploy
"

# Step 4: Verify
echo "[4/4] Verifying..."
HTTP_CODE=$(ssh "$USER@$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost${REMOTE_PATH##/var/www/game}/")
JS_FILE=$(ls "$DIST_DIR"/assets/index-*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "")
if [ -n "$JS_FILE" ]; then
  JS_CODE=$(ssh "$USER@$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost${REMOTE_PATH##/var/www/game}/assets/$JS_FILE")
else
  JS_CODE="skip"
fi

echo ""
echo "=== Deploy Complete ==="
echo "index.html: HTTP $HTTP_CODE"
echo "JS bundle:  HTTP $JS_CODE"
echo "URL: http://$SERVER${REMOTE_PATH##/var/www/game}/"

if [ "$HTTP_CODE" != "200" ]; then
  echo "WARNING: index.html returned $HTTP_CODE"
  exit 1
fi
