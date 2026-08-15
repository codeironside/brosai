#!/usr/bin/env bash
set -euo pipefail

# Pull, rebuild, and restart on the VPS. Run as root or as a user with sudo.
APP_DIR=/opt/brosai

cd "$APP_DIR"
git pull --ff-only

sudo -u brosai bash -lc "cd $APP_DIR/backend && npm ci && npm run build"
sudo -u brosai bash -lc "cd $APP_DIR/frontend && npm ci && npm run build"

systemctl restart brosai-api
systemctl reload caddy

echo "Released $(git rev-parse --short HEAD)"
