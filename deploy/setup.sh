#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 22.04/24.04 app bootstrap. Run as root after DNS is pointed at this VPS.
#   sudo bash deploy/setup.sh
#
# Optional env:
#   ADMIN_SSH_PUBKEY   full public key line for the sudo admin user
#   DEPLOY_SSH_PUBKEY  full public key line for GitHub Actions
#   CADDY_EMAIL        Let's Encrypt contact (default admin@vamvamvamai.com)
#   REPO_URL           git clone URL

APP_DIR=/opt/brosai
REPO_URL="${REPO_URL:-https://github.com/codeironside/brosai.git}"
CADDY_EMAIL="${CADDY_EMAIL:-admin@vamvamvamai.com}"
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

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
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

sed "s/admin@vamvamvamai.com/${CADDY_EMAIL}/" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
install -m 644 "$APP_DIR/deploy/brosai-api.service" /etc/systemd/system/brosai-api.service

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if [[ -f "$APP_DIR/backend/.env.production" ]] && grep -q 'mongodb+srv://USER:PASS' "$APP_DIR/backend/.env.production"; then
  echo "Skipping first API start until .env.production is filled in."
else
  sudo -u brosai bash -lc "cd $APP_DIR/backend && npm ci && npm run build"
  sudo -u brosai bash -lc "cd $APP_DIR/frontend && npm ci && npm run build"
  systemctl daemon-reload
  systemctl enable --now brosai-api
fi

systemctl enable --now caddy
caddy validate --config /etc/caddy/Caddyfile || true
systemctl reload caddy || true

echo
echo "App bootstrap done."
echo "Next: edit $APP_DIR/backend/.env.production, then: systemctl enable --now brosai-api"
echo "Then run: sudo bash $APP_DIR/deploy/harden.sh"
echo "Put ADMIN_SSH_PUBKEY and DEPLOY_SSH_PUBKEY in place before locking SSH."
