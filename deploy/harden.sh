#!/usr/bin/env bash
set -euo pipefail

# OS hardening. Run as root AFTER you can SSH in as the admin user with a key.
#   sudo bash deploy/harden.sh

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ufw fail2ban unattended-upgrades apt-listchanges

echo 'Unattended-Upgrade::Automatic-Reboot "false";' >/etc/apt/apt.conf.d/52unattended-brosai
dpkg-reconfigure -f noninteractive unattended-upgrades

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

install -m 644 "$(dirname "$0")/fail2ban-sshd.local" /etc/fail2ban/jail.d/sshd.local
systemctl enable --now fail2ban
systemctl restart fail2ban

if [[ -f "$(dirname "$0")/sshd-brosai.conf" ]]; then
  if id admin >/dev/null 2>&1 && id deploy >/dev/null 2>&1; then
    install -m 600 "$(dirname "$0")/sshd-brosai.conf" /etc/ssh/sshd_config.d/99-brosai.conf
    sshd -t
    systemctl reload ssh || systemctl reload sshd
    echo "SSH hardened: keys only, root login disabled, AllowUsers admin deploy"
  else
    echo "Skipped SSH lock-down until both 'admin' and 'deploy' users exist."
  fi
fi

echo "Hardening complete. Confirm a second SSH session as admin before closing this one."
