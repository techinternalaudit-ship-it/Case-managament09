#!/bin/bash
set -e

# ============================================================
#  Vigilance — One-shot deploy script for Ubuntu 22.04
#  Paste this entire script into your Lightsail SSH terminal
# ============================================================

echo "============================================"
echo "  Vigilance Deployment — Starting..."
echo "============================================"

# ── 1. System updates ──────────────────────────────────────
echo "[1/6] Updating system..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ── 2. Install Docker ──────────────────────────────────────
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  echo "Docker installed. You may need to re-login for group changes."
else
  echo "Docker already installed."
fi

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin 2>/dev/null || true

# ── 3. Install Nginx ──────────────────────────────────────
echo "[3/6] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx

# ── 4. Clone the repo ─────────────────────────────────────
echo "[4/6] Setting up application..."
APP_DIR="$HOME/vigilance"

if [ -d "$APP_DIR" ]; then
  echo "Directory exists. Pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "Cloning repository..."
  git clone https://github.com/techinternalaudit-ship-it/Case-managament09.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Create production env file ─────────────────────────
echo "[5/6] Setting up environment..."
if [ ! -f .env.production ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  DB_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+')

  cat > .env.production << ENVEOF
# ─── Database ───
DATABASE_URL="postgresql://vigilance:${DB_PASSWORD}@db:5432/vigilance"

# ─── Auth ───
AUTH_SECRET="${AUTH_SECRET}"
AUTH_TRUST_HOST=true

# Google OAuth (fill in your credentials)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
GOOGLE_ALLOWED_DOMAIN="paytm.com"

# ─── App ───
NEXT_PUBLIC_APP_URL="http://13.206.45.29"
SLA_DAYS_DEFAULT=40

# ─── File Storage ───
STORAGE_DIR="./uploads"

# ─── Email (SMTP) ───
SMTP_FROM="Vigilance <vigilance@paytm.com>"
# SMTP_HOST=""
# SMTP_PORT=587
# SMTP_USER=""
# SMTP_PASS=""
ENVEOF

  # Save DB password for docker-compose
  echo "DB_PASSWORD=${DB_PASSWORD}" > .env

  echo "Created .env.production with auto-generated secrets."
  echo "DB Password: ${DB_PASSWORD}"
  echo "Auth Secret: ${AUTH_SECRET}"
  echo ""
  echo ">>> SAVE THESE VALUES SOMEWHERE SAFE <<<"
  echo ""
else
  echo ".env.production already exists, skipping."
fi

# ── 6. Build & Start ──────────────────────────────────────
echo "[6/6] Building and starting containers..."
sudo docker compose up -d --build

echo ""
echo "============================================"
echo "  Waiting for containers to be healthy..."
echo "============================================"
sleep 10

# Check status
sudo docker compose ps

# ── 7. Configure Nginx ────────────────────────────────────
echo "Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/vigilance > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 13.206.45.29;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/vigilance /etc/nginx/sites-enabled/vigilance
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "  App URL:  http://13.206.45.29"
echo ""
echo "  Default admin login:"
echo "    Email:    admin@paytm.com"
echo "    Password: admin123"
echo ""
echo "  Useful commands:"
echo "    sudo docker compose logs -f app    # View app logs"
echo "    sudo docker compose restart app    # Restart app"
echo "    sudo docker compose down           # Stop everything"
echo "    sudo docker compose up -d --build  # Rebuild & start"
echo ""
