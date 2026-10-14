# WhatsApp notifications — OpenWA on Oracle Cloud

The app sends WhatsApp messages (ride posted, new seat request, approved / declined) through a
self-hosted [OpenWA](https://github.com/rmyndharis/OpenWA) gateway. OpenWA links a normal WhatsApp
number by QR code and exposes a REST API; the app calls it from `src/lib/whatsapp.ts`.

Production instance: **https://wa.harivanashram.org** (Oracle Cloud Always Free, Ubuntu 24.04, ARM).

> **Ban risk.** OpenWA drives an unofficial WhatsApp client. Use a dedicated number you can afford to
> lose, keep messages transactional (no bulk/cold messaging), and keep email as the reliable channel.

## Why Oracle Cloud (and not Vercel / App Platform)

OpenWA runs a headless Chrome that stays logged in to WhatsApp, so it needs an always-on server with
**1–2 GB RAM or more** and a **persistent disk**: the WhatsApp login lives only on the filesystem
(`/app/data/sessions`), never in the database. Vercel and DigitalOcean App Platform have ephemeral
disks — every restart would unlink WhatsApp. Oracle's Always Free tier gives an ARM VM with up to
24 GB RAM at no cost, and OpenWA publishes `linux/arm64` images.

## 1. Create the VM

1. **Network first** (avoids the "You must select a public subnet" warning):
   ☰ → Networking → Virtual cloud networks → Actions → **Start VCN Wizard** →
   **Create VCN with Internet Connectivity** → name `openwa-vcn` → defaults → Create.
2. ☰ → Compute → Instances → **Create instance**
   - **Image:** Canonical Ubuntu 24.04 (not Minimal)
   - **Shape:** Ampere → `VM.Standard.A1.Flex`, **1 OCPU / 6 GB** (inside the free limits)
   - **Networking:** existing VCN `openwa-vcn` → subnet **public subnet-openwa-vcn** →
     **Assign a public IPv4 address: on**
   - **SSH keys:** upload `~/.ssh/id_ed25519.pub` (create with `ssh-keygen -t ed25519`)
   - Boot volume: default (~47 GB, free)
3. Copy the instance's **public IP**.

"Out of host capacity"? Try another availability domain, retry later, or upgrade the account to
**Pay As You Go** (still $0 within free limits; also stops Oracle reclaiming idle free VMs). Set a
budget alert. Free ARM VMs exist only in the account's home region.

## 2. Open ports 80 / 443

**Oracle network:** instance → Subnet → Security → **Default Security List for openwa-vcn** →
Add Ingress Rules: source `0.0.0.0/0`, TCP, destination port `80`; repeat for `443`.

**VM firewall** (done in step 4). Oracle's Ubuntu image blocks these ports with iptables — use
iptables, **not ufw** (ufw conflicts with Oracle's rules and can lock you out of SSH).

## 3. DNS

At the DNS host for `harivanashram.org` (GoDaddy), add an **A record**: `wa` → the VM's public IP.

## 4. Prepare the VM

The login user is `ubuntu`, not `root`.

```bash
ssh ubuntu@<public-ip>

sudo iptables -I INPUT 5 -p tcp -m multiport --dports 80,443 -m state --state NEW -j ACCEPT
sudo netfilter-persistent save

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit        # log back in so the docker group applies
```

## 5. Install OpenWA

```bash
ssh ubuntu@<public-ip>
git clone https://github.com/rmyndharis/OpenWA.git ~/openwa
cd ~/openwa
cp .env.example .env
openssl rand -hex 32     # → API_MASTER_KEY (store it in the team password manager)
nano .env
```

Set in `.env`:

```env
NODE_ENV=production
AUTO_START_SESSIONS=true          # reconnect WhatsApp after restarts/reboots
API_MASTER_KEY=<generated key>
DASHBOARD_URL=https://wa.harivanashram.org
```

Run the published image instead of building from source:

```bash
cat > docker-compose.override.yml <<'EOF'
services:
  openwa-api:
    image: ghcr.io/rmyndharis/openwa:latest
EOF
docker compose pull openwa-api && docker compose up -d --no-build
docker compose logs -f openwa-api     # wait for "OpenWA is running", then Ctrl+C
```

The container only listens on `127.0.0.1:2785`; Caddy (next step) is the public entry point.

## 6. HTTPS with Caddy

```bash
sudo apt update && sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
wa.harivanashram.org {
    reverse_proxy 127.0.0.1:2785
}
EOF
sudo systemctl reload caddy
```

Caddy fetches a Let's Encrypt certificate automatically once DNS points at the VM. Opening the site
before that finishes shows `ERR_SSL_PROTOCOL_ERROR` — wait a minute, flush the Mac DNS cache
(`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`) and retry.

## 7. Link WhatsApp

1. Open https://wa.harivanashram.org and sign in with `API_MASTER_KEY`.
2. Create a session and scan the QR with the notification number
   (WhatsApp → Settings → Linked devices). Copy the **session ID**.
3. **API Keys** → create a dedicated key for the app (don't give the app the master key).

`/api/docs` (Swagger) returns 404 in production mode — expected.

## 8. Connect the app

Server-side env vars (Vercel → Settings → Environment Variables, and `.env.local` for local dev):

| Variable | Value |
|---|---|
| `WHATSAPP_MODE` | `off` (send nothing) · `dev` (everything goes to `WHATSAPP_DEV_NUMBER`) · `live` (real users) |
| `WHATSAPP_API_URL` | `https://wa.harivanashram.org` |
| `WHATSAPP_SESSION_ID` | session ID from step 7 |
| `WHATSAPP_API_KEY` | app key from step 7 |
| `WHATSAPP_DEV_NUMBER` | tester's number, used only when `WHATSAPP_MODE=dev` |
| `WHATSAPP_HEADER` | optional first line of every message |

`WHATSAPP_MODE` behaves the same on every environment, so production can be switched to `dev` for a
safe test and back to `live` (redeploy after changing a Vercel env var).

Quick manual test from any machine:

```bash
curl -X POST https://wa.harivanashram.org/api/sessions/<SESSION_ID>/messages/send-text \
  -H "Content-Type: application/json" -H "X-API-Key: <API_KEY>" \
  -d '{"chatId": "91XXXXXXXXXX@c.us", "text": "hello"}'
```

## Operations

- **Upgrade** (do this regularly — WhatsApp Web changes can break sending until OpenWA ships a fix):
  `cd ~/openwa && git pull && docker compose pull openwa-api && docker compose up -d --no-build`
- **Logs:** `cd ~/openwa && docker compose logs --tail 200 openwa-api`
- **Session status:** dashboard, or `GET /api/sessions` with the API key. If the status isn't
  `ready`, WhatsApp may have unlinked the number — re-scan the QR.
- **Backups:** the WhatsApp login and database are in the `openwa-data` Docker volume.
  `scripts/backup.sh` in the OpenWA repo captures both; copy the archive off the VM. Losing the
  volume means re-scanning the QR (the session ID will change → update `WHATSAPP_SESSION_ID`).
- **Rotating the app key:** create a new key in the dashboard, update Vercel + `.env.local`,
  redeploy, then revoke the old key.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Site doesn't load at all | Security List rules (step 2) and the iptables rule (step 4) — both are needed |
| `ERR_SSL_PROTOCOL_ERROR` | Certificate not issued yet / DNS not propagated — wait, then `sudo systemctl restart caddy` |
| App logs `[whatsapp] send failed: 401` | Wrong/revoked `WHATSAPP_API_KEY` |
| App logs `[whatsapp] send failed: 404` | Wrong `WHATSAPP_SESSION_ID` (session recreated?) |
| App logs `skipped (... WHATSAPP_DEV_NUMBER unset)` | `WHATSAPP_MODE=dev` needs `WHATSAPP_DEV_NUMBER` |
| Nothing sent, nothing logged | `WHATSAPP_MODE` is unset or `off` |
