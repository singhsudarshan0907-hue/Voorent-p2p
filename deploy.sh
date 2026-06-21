#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Voorent — Vultr VPS Deployment Script
# Run this on your Vultr Ubuntu 22.04 VPS as root (first time),
# or as the 'voorent' user for subsequent deploys.
#
# Usage:
#   First time:  sudo bash deploy.sh --setup
#   Re-deploy:   bash deploy.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="api.yourdomain.com"          # ← change this
APP_DIR="/opt/voorent"
SERVICE_NAME="voorent-api"
DB_NAME="voorent"
DB_USER="voorent_db"
DB_PASS=""                            # ← set a strong password

# ── Colours ──────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ─────────────────────────────────────────────────────────────────
# FIRST-TIME SETUP  (sudo bash deploy.sh --setup)
# ─────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--setup" ]]; then
  info "Installing system dependencies..."
  apt-get update -qq
  apt-get install -y -qq \
      curl wget gnupg2 nginx certbot python3-certbot-nginx \
      postgresql postgresql-contrib git

  info "Installing .NET 8 SDK..."
  wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
  dpkg -i packages-microsoft-prod.deb && rm packages-microsoft-prod.deb
  apt-get update -qq
  apt-get install -y -qq dotnet-sdk-8.0

  info "Setting up PostgreSQL..."
  systemctl enable --now postgresql
  sudo -u postgres psql <<SQL
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
    GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

  info "Creating app user and directory..."
  useradd -r -s /bin/false -d ${APP_DIR} voorent || true
  mkdir -p ${APP_DIR}
  chown voorent:voorent ${APP_DIR}

  info "Configuring nginx..."
  cp nginx/voorent.conf /etc/nginx/sites-available/voorent.conf
  ln -sf /etc/nginx/sites-available/voorent.conf /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  info "Obtaining SSL certificate (Let's Encrypt)..."
  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m prasoonsharma@voorent.com

  info "Setup complete. Run 'bash deploy.sh' to deploy the app."
  exit 0
fi

# ─────────────────────────────────────────────────────────────────
# DEPLOY / REDEPLOY
# ─────────────────────────────────────────────────────────────────
info "Building .NET API..."
cd voorent-backend/VoorentApi
dotnet publish -c Release -o ${APP_DIR}/publish --nologo -q
cd -

info "Running DB schema (idempotent)..."
PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} \
    -f voorent-backend/database/schema.sql

# Write production appsettings if not present
PROD_SETTINGS="${APP_DIR}/publish/appsettings.Production.json"
if [[ ! -f "${PROD_SETTINGS}" ]]; then
  warn "appsettings.Production.json not found — creating template."
  cat > "${PROD_SETTINGS}" <<JSON
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASS}"
  },
  "Jwt": {
    "Key": "REPLACE_WITH_32_CHAR_RANDOM_SECRET",
    "Issuer": "voorent"
  },
  "Logging": {
    "LogLevel": { "Default": "Warning" }
  }
}
JSON
  warn "Edit ${PROD_SETTINGS} and set a real JWT key before starting the service."
fi

chown -R voorent:voorent ${APP_DIR}

# Create systemd service if it doesn't exist
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ ! -f "${SERVICE_FILE}" ]]; then
  info "Creating systemd service..."
  cat > "${SERVICE_FILE}" <<UNIT
[Unit]
Description=Voorent API (.NET 8)
After=network.target postgresql.service

[Service]
Type=simple
User=voorent
WorkingDirectory=${APP_DIR}/publish
ExecStart=/usr/bin/dotnet ${APP_DIR}/publish/VoorentApi.dll
Restart=always
RestartSec=5
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5000
StandardOutput=journal
StandardError=journal
SyslogIdentifier=voorent-api

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
fi

info "Restarting API service..."
systemctl restart ${SERVICE_NAME}
sleep 2

if systemctl is-active --quiet ${SERVICE_NAME}; then
  info "✅ API is running at https://${DOMAIN}/swagger"
else
  warn "❌ Service failed to start. Check logs:"
  echo "   journalctl -u ${SERVICE_NAME} -n 50 --no-pager"
fi

info "Building React frontend..."
cd voorent-frontend
npm ci --silent
npm run build
info "Frontend built → dist/ folder. Upload to Cloudflare Pages."
cd -

info "Deploy complete."
