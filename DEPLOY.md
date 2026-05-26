# CAMPOCLARO VPS Deploy

This guide deploys CAMPOCLARO to `campoclaro.eu` with Git, Docker Compose, and an existing host Nginx.

The setup is isolated for a VPS that already hosts other projects:

- Docker Compose project name: `campoclaro`
- Container port: `3001`
- Host port: `127.0.0.1:3101`
- Public traffic: only through Nginx for `campoclaro.eu`

Other projects should not be affected because this app does not bind to public `80` or `443`.

## 1. Prepare DNS

Open your domain DNS panel and create:

```text
A     campoclaro.eu       YOUR_VPS_IP
A     www.campoclaro.eu   YOUR_VPS_IP
```

Wait until DNS propagates. You can check from your computer:

```bash
nslookup campoclaro.eu
```

## 2. Prepare Git Locally

Run these commands on your computer inside the project folder.

```bash
git init
git add .
git commit -m "Prepare production deploy"
```

Create an empty private repository on GitHub, GitLab, or another Git server.

Connect it:

```bash
git remote add origin https://github.com/Skanexis/campoclaro.git
git branch -M main
git push -u origin main
```

Do not commit `.env`. It is already ignored.

## 3. Install Server Packages

SSH into the VPS:

```bash
ssh root@YOUR_VPS_IP
```

Update packages:

```bash
apt update
apt upgrade -y
```

Install Git, Nginx, Docker, and Certbot:

```bash
apt install -y git nginx ca-certificates curl certbot python3-certbot-nginx
```

Install Docker from Docker's official repository:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check:

```bash
docker --version
docker compose version
nginx -v
```

## 4. Clone Project On VPS

Use `/opt` to keep projects organized:

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/Skanexis/campoclaro.git campoclaro
cd /opt/campoclaro
```

## 5. Create Production `.env`

Docker Compose reads `/opt/campoclaro/.env`. The `.env.production.example` file is only a template for creating that real `.env` file once:

```bash
cp .env.production.example .env
nano .env
```

Recommended values:

```text
API_PORT=3001
CAMPOCLARO_HOST_PORT=3101
APP_ORIGIN=https://campoclaro.eu
SESSION_SECRET=PASTE_RANDOM_SECRET_HERE
TELEGRAM_BOT_TOKEN=PASTE_BOT_TOKEN_HERE
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
ADMIN_TELEGRAM_IDS=123456789,987654321
TELEGRAM_WEBHOOK_SECRET=PASTE_RANDOM_WEBHOOK_SECRET_HERE
```

Generate a strong secret:

```bash
openssl rand -hex 32
```

Notes:

- `CAMPOCLARO_HOST_PORT=3101` is intentionally not `80` or `443`.
- If another project already uses `3101`, choose another local port, for example `3102`, and update the Nginx config later.
- `ADMIN_TELEGRAM_IDS` are numeric Telegram user IDs, comma-separated.
- `TELEGRAM_BOT_USERNAME` is the username without `@`; it must refer to the same bot as `TELEGRAM_BOT_TOKEN`.
- Login uses a bot deep-link and the `/start` command, not Telegram's website login widget. `/setdomain` is not required.
- `TELEGRAM_WEBHOOK_SECRET` must be a private random string, for example generated with `openssl rand -hex 32`.

## 6. Start Docker App

From `/opt/campoclaro`:

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs -f app
```

Test locally on the VPS:

```bash
curl http://127.0.0.1:3101/api/health
```

Expected:

```json
{"ok":true}
```

Register the bot webhook after HTTPS is configured in step 8:

```bash
cd /opt/campoclaro
set -a
. ./.env
set +a
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://campoclaro.eu/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

## 7. Configure Nginx

Copy the prepared config:

```bash
cp /opt/campoclaro/deploy/nginx/campoclaro.eu.conf /etc/nginx/sites-available/campoclaro.eu
ln -s /etc/nginx/sites-available/campoclaro.eu /etc/nginx/sites-enabled/campoclaro.eu
```

If you changed `CAMPOCLARO_HOST_PORT`, edit the Nginx file:

```bash
nano /etc/nginx/sites-available/campoclaro.eu
```

Make sure this line matches your port:

```nginx
proxy_pass http://127.0.0.1:3101;
```

Test Nginx:

```bash
nginx -t
```

Reload:

```bash
systemctl reload nginx
```

Open:

```text
http://campoclaro.eu
```

## 8. Enable HTTPS

Run Certbot:

```bash
certbot --nginx -d campoclaro.eu -d www.campoclaro.eu
```

Choose redirect HTTP to HTTPS when Certbot asks.

Test renewal:

```bash
certbot renew --dry-run
```

Open:

```text
https://campoclaro.eu
```

## 9. Firewall

If you use UFW:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Do not open `3101` publicly. Docker binds it only to `127.0.0.1`.

## 10. Updating The Site Later

On your computer:

```bash
git add .
git commit -m "Describe changes"
git push
```

On the VPS:

```bash
cd /opt/campoclaro
git pull
docker compose up -d --build
docker compose logs -f app
```

## 11. Backup Data

Orders and products are stored in:

```text
/opt/campoclaro/server/data
```

Create a quick backup:

```bash
cd /opt/campoclaro
tar -czf campoclaro-data-$(date +%F).tar.gz server/data
```

Download it from another terminal:

```bash
scp root@YOUR_VPS_IP:/opt/campoclaro/campoclaro-data-YYYY-MM-DD.tar.gz .
```

## 12. Useful Commands

Restart app:

```bash
cd /opt/campoclaro
docker compose restart app
```

Stop app:

```bash
cd /opt/campoclaro
docker compose down
```

See app logs:

```bash
cd /opt/campoclaro
docker compose logs -f app
```

See Nginx logs:

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

Check which process uses a port:

```bash
ss -tulpn | grep 3101
```

## 13. If Something Breaks

If Docker is unhealthy:

```bash
cd /opt/campoclaro
docker compose ps
docker compose logs app
```

If Nginx fails:

```bash
nginx -t
journalctl -u nginx --no-pager -n 80
```

If domain does not open:

```bash
curl http://127.0.0.1:3101/api/health
curl -I http://campoclaro.eu
```

If local Docker works but domain does not, the problem is Nginx, DNS, or firewall.
