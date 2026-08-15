#!/usr/bin/env bash
set -euo pipefail

# Use existing nginx on :80/:443. Stop Caddy if it was installed.
# Run as root: sudo bash deploy/install-nginx.sh

APP_DIR=/opt/brosai
SRC="$(cd "$(dirname "$0")" && pwd)/nginx"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@vamvamvamai.com}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/install-nginx.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

if systemctl list-unit-files | grep -q '^caddy.service'; then
  systemctl disable --now caddy || true
  echo "Stopped Caddy so it no longer fights nginx for port 443."
fi

install -d -m 755 /var/www/html
install -m 644 "$SRC/vamvamvamai.com.conf" /etc/nginx/sites-available/vamvamvamai.com.conf
install -m 644 "$SRC/api.vamvamvamai.com.conf" /etc/nginx/sites-available/api.vamvamvamai.com.conf

ln -sfn /etc/nginx/sites-available/vamvamvamai.com.conf /etc/nginx/sites-enabled/vamvamvamai.com.conf
ln -sfn /etc/nginx/sites-available/api.vamvamvamai.com.conf /etc/nginx/sites-enabled/api.vamvamvamai.com.conf

nginx -t
systemctl enable --now nginx
systemctl reload nginx

if [[ "${SKIP_CERTBOT:-0}" != "1" ]]; then
  certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect \
    -d vamvamvamai.com -d www.vamvamvamai.com -d api.vamvamvamai.com
  nginx -t
  systemctl reload nginx
fi

echo "nginx sites enabled. Test: curl -I https://vamvamvamai.com"
