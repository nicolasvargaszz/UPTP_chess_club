#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/UPTP_chess_club"
SERVER_DIR="$APP_DIR/server"
WEB_DIR="/var/www/uptp_chess_club"
API_HOST="chess.24-199-127-101.traefik.me"
API_URL="https://$API_HOST"
SERVICE_NAME="uptp-chess-api"

echo "== UPTP Chess Club stable API setup =="

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Repository not found at $APP_DIR. Cloning..."
  git clone https://github.com/nicolasvargaszz/UPTP_chess_club.git "$APP_DIR"
fi

cd "$APP_DIR"
git pull

echo "== Installing system dependencies =="
apt update
apt install -y git curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https build-essential python3 make g++ sqlite3 nodejs npm rsync

if ! command -v caddy >/dev/null 2>&1; then
  echo "== Installing Caddy =="
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt update
  apt install -y caddy
else
  echo "== Updating Caddy if needed =="
  apt update
  apt install -y caddy
fi

cd "$SERVER_DIR"

echo "== Installing or repairing Node dependencies =="
npm install

if [ ! -f .env ]; then
  echo "== Creating .env =="
  JWT_SECRET="$(openssl rand -hex 32)"
  read -r -s -p "Admin password for the tournament: " ADMIN_PASSWORD
  echo
  cat > .env <<EOF
PORT=3000
JWT_SECRET=$JWT_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
CORS_ORIGIN=https://nicolasvargaszz.github.io
EOF
else
  echo "== Existing .env found. Keeping it. =="
fi

echo "== Installing API systemd service =="
cp "$SERVER_DIR/deploy/$SERVICE_NAME.service" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "== Publishing static web files =="
mkdir -p "$WEB_DIR"
rsync -a --delete \
  --exclude ".git" \
  --exclude "server/data" \
  --exclude "server/node_modules" \
  "$APP_DIR/" "$WEB_DIR/"
chown -R caddy:caddy "$WEB_DIR"

echo "== Installing Caddy config =="
cp "$SERVER_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  echo "== Opening local firewall ports 80/443 =="
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

echo "== Applying official tournament state =="
node "$SERVER_DIR/scripts/apply-2026-06-01-updates.js"
systemctl restart "$SERVICE_NAME"

echo "== Health check =="
sleep 3
curl -fsS "http://127.0.0.1:3000/api/health"
echo
sleep 8
curl -fsS "$API_URL/api/health"
echo
echo
echo "Setup complete."
echo "Public API URL: $API_URL"
echo "Test from any browser: $API_URL/api/health"
