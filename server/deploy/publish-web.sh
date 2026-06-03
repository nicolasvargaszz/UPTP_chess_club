#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/UPTP_chess_club"
WEB_DIR="/var/www/uptp_chess_club"

echo "== Publishing UPTP Chess Club web files =="

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Repository not found at $APP_DIR."
  exit 1
fi

cd "$APP_DIR"
git pull

mkdir -p "$WEB_DIR"
rsync -a --delete \
  --exclude ".git" \
  --exclude "server/data" \
  --exclude "server/node_modules" \
  "$APP_DIR/" "$WEB_DIR/"

chown -R caddy:caddy "$WEB_DIR"

cp "$APP_DIR/server/deploy/Caddyfile" /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

sleep 8
curl -fsS https://chess.24-199-127-101.traefik.me/api/health
echo
echo "Web updated at https://chess.24-199-127-101.traefik.me"
