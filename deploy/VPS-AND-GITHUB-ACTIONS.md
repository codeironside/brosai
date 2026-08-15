# Production deploy: VPS + TLS + GitHub Actions

This stack keeps HTTP off the public internet. Caddy terminates TLS, redirects every HTTP request to HTTPS, renews Let’s Encrypt certificates, and the Node API only listens on `127.0.0.1:5000`.

| Public hostname | What it serves |
|---|---|
| `https://vamvamvamai.com` | Static frontend + `/api` reverse-proxy |
| `https://www.vamvamvamai.com` | Permanent redirect to apex HTTPS |
| `https://api.vamvamvamai.com` | Express API (OAuth callbacks, health) |

MongoDB stays on Atlas. Do not install Mongo on the VPS.

---

## 0. What SSL actually guarantees (and what it does not)

Caddy **does** enforce:

- Automatic certificate issue and renewal (Let’s Encrypt)
- HTTP → HTTPS redirect on ports 80 → 443
- TLS 1.2 and TLS 1.3 only
- HSTS (`max-age=31536000; includeSubDomains`) so browsers refuse HTTP after the first HTTPS visit
- `upgrade-insecure-requests` on the frontend
- API not reachable on the public NIC (firewall + bind to localhost)

You still must:

- Use DNS A records to this VPS (and keep port 80 open so HTTP-01 issuance works)
- Fill production secrets on the server only (never commit `.env.production`)
- SSH with keys, not passwords
- Update OAuth redirect URLs at Twitter / LinkedIn / Meta to `https://api.vamvamvamai.com/api/social/callback`

If Cloudflare orange-cloud is enabled before certificates exist, issuance can fail. Start **DNS only** (grey cloud). Turn the proxy on later with SSL mode **Full (strict)**.

---

## 1. Buy and prepare the VPS

1. Create an Ubuntu **24.04 LTS** (or 22.04) VPS. 2 GB RAM is enough; 4 GB is more comfortable for `npm ci`.
2. Note the public IPv4 address.
3. In the panel, add your SSH public key for the first login if the provider supports it.
4. Log in once:

```bash
ssh root@YOUR_VPS_IP
```

5. Update the OS:

```bash
apt update && apt upgrade -y
reboot
```

Reconnect after reboot.

---

## 2. Point DNS (do this before Caddy starts)

At your domain registrar, create:

| Type | Name | Value |
|---|---|---|
| A | `@` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` |
| A | `api` | `YOUR_VPS_IP` |

Wait until these resolve:

```bash
dig +short vamvamvamai.com
dig +short www.vamvamvamai.com
dig +short api.vamvamvamai.com
```

All three must print the VPS IP. Let’s Encrypt will fail if they still point elsewhere.

---

## 3. Create SSH keys on your laptop (Windows PowerShell)

Admin key (you) and deploy key (GitHub Actions) — two separate keys.

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\vamvamvam-admin -C "admin@vamvamvamai.com" -N ""
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\vamvamvam-deploy -C "github-actions@vamvamvamai.com" -N ""
```

Print the public keys (you will paste them into the VPS):

```powershell
Get-Content $env:USERPROFILE\.ssh\vamvamvam-admin.pub
Get-Content $env:USERPROFILE\.ssh\vamvamvam-deploy.pub
```

---

## 4. Bootstrap the app on the VPS

From your laptop, copy the repo or clone on the server. Easiest first run:

```bash
ssh root@YOUR_VPS_IP
apt install -y git
git clone https://github.com/codeironside/brosai.git /tmp/brosai-bootstrap
```

Set the public keys (paste the full `ssh-ed25519 AAAA...` lines):

```bash
export ADMIN_SSH_PUBKEY='ssh-ed25519 AAAA... admin@vamvamvamai.com'
export DEPLOY_SSH_PUBKEY='ssh-ed25519 AAAA... github-actions@vamvamvamai.com'
export CADDY_EMAIL='you@your-real-email.com'
bash /tmp/brosai-bootstrap/deploy/setup.sh
```

`setup.sh` installs Node 20, Caddy, UFW (22/80/443), users `admin`, `deploy`, `brosai`, sudoers for release, and copies the Caddyfile.

---

## 5. Production secrets (server only)

```bash
nano /opt/brosai/backend/.env.production
```

Required:

- `NODE_ENV=production`
- `HOST=127.0.0.1`
- `PORT=5000`
- `DB_URI` (Atlas)
- `CORS_ORIGINS=https://vamvamvamai.com,https://www.vamvamvamai.com`
- `FRONTEND_URL=https://vamvamvamai.com`
- All `*_REDIRECT_URI=https://api.vamvamvamai.com/api/social/callback`
- New `JWT_SECRET`, `JWT_REFRESH_SECRET` (long random)
- `TOKEN_ENCRYPTION_KEY` (64 hex chars)
- Firebase, OpenAI, OAuth client secrets

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

File permissions must stay:

```bash
chown root:brosai /opt/brosai/backend/.env.production
chmod 640 /opt/brosai/backend/.env.production
```

The GitHub `deploy` user cannot read this file.

Start the API after secrets are real:

```bash
cd /opt/brosai/backend && sudo -u brosai npm ci && sudo -u brosai npm run build
cd /opt/brosai/frontend && sudo -u brosai npm ci && sudo -u brosai npm run build
systemctl enable --now brosai-api
systemctl reload caddy
curl -s http://127.0.0.1:5000/health
```

---

## 6. Confirm TLS before you lock SSH

From your laptop:

```bash
curl -I http://vamvamvamai.com
curl -I https://vamvamvamai.com
curl -I https://api.vamvamvamai.com/health
```

Expect:

- `http://` → `301`/`308` to `https://`
- `https://` → `200` with `strict-transport-security`
- `https://api.vamvamvamai.com/health` → JSON `healthy`

Optional: [SSL Labs](https://www.ssllabs.com/ssltest/) for `vamvamvamai.com` and `api.vamvamvamai.com`. Aim for A or A+.

Test SSH as admin **in a second window** before hardening:

```powershell
ssh -i $env:USERPROFILE\.ssh\vamvamvam-admin admin@YOUR_VPS_IP
```

Then on the VPS:

```bash
sudo bash /opt/brosai/deploy/harden.sh
```

That enables UFW defaults, fail2ban, unattended upgrades, and (only if `admin` and `deploy` exist) key-only SSH with root login disabled.

Keep the original root session open until the admin key login still works.

Add to your laptop `~/.ssh/config`:

```
Host vamvamvam
  HostName YOUR_VPS_IP
  User admin
  IdentityFile ~/.ssh/vamvamvam-admin
```

---

## 7. OAuth provider consoles

For each connected platform, set:

- Redirect: `https://api.vamvamvamai.com/api/social/callback`
- App domain / site URL: `https://vamvamvamai.com`

---

## 8. GitHub Actions automatic deploys

### 8.1 Create the `production` environment

GitHub repo → **Settings → Environments → New environment** → name it `production`.  
Optional: required reviewers so main cannot ship unattended.

### 8.2 Add repository secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or `vamvamvamai.com` |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` (or your SSH port) |
| `VPS_SSH_KEY` | **Private** key contents of `vamvamvam-deploy` (the `-----BEGIN OPENSSH PRIVATE KEY-----` file, not `.pub`) |
| `VPS_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -t ed25519,rsa YOUR_VPS_IP` |

Get known_hosts from your laptop:

```powershell
ssh-keyscan -t ed25519,rsa YOUR_VPS_IP
```

Paste the full lines into `VPS_SSH_KNOWN_HOSTS`. This pins the server key so a MITM cannot intercept deploys.

### 8.3 Confirm the deploy user on the VPS

```bash
sudo -u deploy sudo /usr/local/bin/brosai-release
```

That must succeed without a password prompt.

### 8.4 What the workflow does

On every **pull request** to `main`: install, typecheck, and build. No SSH.

On every **push to `main`** (and manual **Run workflow**):

1. Build frontend and backend on GitHub runners
2. Rsync `frontend/dist`, `backend/dist`, lockfiles, and `deploy/` to `/opt/brosai`
3. Never uploads `.env.production`
4. `sudo /usr/local/bin/brosai-release` installs production Node deps, reloads Caddy, restarts systemd
5. Local health check on `127.0.0.1:5000/health`
6. Public HTTPS check of `https://api.vamvamvamai.com/health` and `https://vamvamvamai.com/`

Failed health check fails the job. Rollback:

```bash
ssh vamvamvam
sudo /usr/local/bin/brosai-rollback
```

---

## 9. Ongoing operations

```bash
systemctl status brosai-api caddy
journalctl -u brosai-api -f
journalctl -u caddy -f
sudo caddy reload --config /etc/caddy/Caddyfile
```

Certificates renew automatically. Caddy uses port 80 for HTTP-01; do not block it.

---

## 10. Scaling later (without rewriting this)

1. Put Cloudflare in front (Full strict) for DDoS and CDN of `/assets/*`.
2. Move the API to a second VPS; point `api.vamvamvamai.com` at it; keep Caddy on each box.
3. Keep Atlas as the database. Add a replica set only when Atlas says you need it.

Do not add Docker or PM2 unless you have a second host to orchestrate. systemd + Caddy is the production process model on this VPS.
