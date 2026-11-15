#!/usr/bin/env bash
# Production admin deploy — installed on servers as /usr/local/bin/deploy-supershyft-admin
# Clone path: /var/www/supershyft-admin — branch: origin/main (SuperShyft-devs/dev-admin)
set -euo pipefail

ADMIN_DIR="/var/www/supershyft-admin"
BRANCH="main"

_deploy_user() {
  if [[ "$(id -u)" -eq 0 && -n "${SUDO_USER:-}" ]]; then
    echo "$SUDO_USER"
  else
    id -un
  fi
}

echo "=== Deploying Supershyft Admin ==="

echo "Pulling latest code..."
_run_user="$(_deploy_user)"
if [[ "$_run_user" != "$(id -un)" ]]; then
  sudo -u "$_run_user" -H git -C "$ADMIN_DIR" pull origin "$BRANCH"
else
  git -C "$ADMIN_DIR" pull origin "$BRANCH"
fi

cd "$ADMIN_DIR"

echo "Installing dependencies..."
npm ci

echo "Building admin..."
npm run build

echo "Testing Nginx..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "=== Admin deployment complete ==="