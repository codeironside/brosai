#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 22.04/24.04 app bootstrap. Run as root after DNS is pointed at this VPS.
#   sudo bash deploy/setup.sh
#
# Optional env:
#   ADMIN_SSH_PUBKEY   full public key line for the sudo admin user
#   DEPLOY_SSH_PUBKEY  full public key line for GitHub Actions
#   CERTBOT_EMAIL      Let's Encrypt contact (default admin@vamvamvamai.com)
#   REPO_URL           git clone URL

APP_DIR=/opt/brosai
REPO_URL="${REPO_URL:-https://github.com/codeironside/brosai.git}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@vamvamvamai.com}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root (sudo bash deploy/setup.sh)"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw rsync debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get install -y nginx certbot python3-certbot-nginx
if systemctl list-unit-files | grep -q '^caddy.service'; then
  systemctl disable --now caddy || true
fi

id -u brosai >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin brosai

if ! id admin >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo admin
  echo "admin ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/admin
  chmod 440 /etc/sudoers.d/admin
fi

if ! id deploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash deploy
  usermod -aG brosai deploy
fi

install_key() {
  local user_name="$1"
  local pubkey="$2"
  local home_dir
  home_dir="$(eval echo "~$user_name")"
  mkdir -p "$home_dir/.ssh"
  chmod 700 "$home_dir/.ssh"
  touch "$home_dir/.ssh/authorized_keys"
  chmod 600 "$home_dir/.ssh/authorized_keys"
  if [[ -n "$pubkey" ]] && ! grep -qxF "$pubkey" "$home_dir/.ssh/authorized_keys"; then
    echo "$pubkey" >>"$home_dir/.ssh/authorized_keys"
  fi
  chown -R "$user_name:$user_name" "$home_dir/.ssh"
}

install_key admin "${ADMIN_SSH_PUBKEY:-}"
install_key deploy "${DEPLOY_SSH_PUBKEY:-}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

chown -R brosai:brosai "$APP_DIR"
chmod 2755 "$APP_DIR"
chmod -R g+rwX "$APP_DIR"

if [[ ! -f "$APP_DIR/backend/.env.production" ]]; then
  cp "$APP_DIR/deploy/env.production.example" "$APP_DIR/backend/.env.production"
  echo "Created $APP_DIR/backend/.env.production — fill in secrets before the API will start."
fi
chown root:brosai "$APP_DIR/backend/.env.production"
chmod 640 "$APP_DIR/backend/.env.production"

install -m 755 "$APP_DIR/deploy/brosai-release" /usr/local/bin/brosai-release
install -m 755 "$APP_DIR/deploy/brosai-rollback" /usr/local/bin/brosai-rollback
install -m 440 "$APP_DIR/deploy/sudoers-deploy" /etc/sudoers.d/brosai-deploy
visudo -cf /etc/sudoers.d/brosai-deploy

install -m 644 "$APP_DIR/deploy/brosai-api.service" /etc/systemd/system/brosai-api.service
CERTBOT_EMAIL="$CERTBOT_EMAIL" SKIP_CERTBOT="${SKIP_CERTBOT:-0}" bash "$APP_DIR/deploy/install-nginx.sh"

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if [[ -f "$APP_DIR/backend/.env.production" ]] && grep -q 'mongodb+srv://USER:PASS' "$APP_DIR/backend/.env.production"; then
  echo "Skipping first API start until .env.production is filled in."
else
  sudo -u brosai bash -lc "cd $APP_DIR/backend && npm ci --legacy-peer-deps && npm run build"
  sudo -u brosai bash -lc "cd $APP_DIR/frontend && npm ci --legacy-peer-deps && npm run build"
  systemctl daemon-reload
  systemctl enable --now brosai-api
fi

echo
echo "App bootstrap done (nginx + Node API)."
echo "Next: edit $APP_DIR/backend/.env.production, then: systemctl enable --now brosai-api"
echo "Then run: sudo bash $APP_DIR/deploy/harden.sh"
