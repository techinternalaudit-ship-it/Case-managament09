#!/bin/bash
set -e

# ============================================================
# Vigilance — Lightsail Fresh Deploy Script
# Run this ON the Lightsail instance (Ubuntu/Node)
# ============================================================

APP_DIR="/home/ubuntu/vigilance"
REPO_URL="https://github.com/techinternalaudit-ship-it/Case-managament09.git"
NODE_VERSION="20"

echo "========================================="
echo "  Vigilance — Fresh Lightsail Deploy"
echo "========================================="

# 1. System updates & Node.js
echo ""
echo "[1/8] Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl git build-essential

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt $NODE_VERSION ]]; then
  echo "Installing Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

# 2. Install PM2 globally
echo ""
echo "[2/8] Installing PM2..."
sudo npm install -g pm2

# 3. Clone or pull repo
echo ""
echo "[3/8] Setting up codebase..."
cd /home/ubuntu
if [ -d "$APP_DIR" ]; then
  echo "Removing old install..."
  pm2 stop vigilance 2>/dev/null || true
  pm2 delete vigilance 2>/dev/null || true
  rm -rf "$APP_DIR"
fi

git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# 4. Create .env
echo ""
echo "[4/8] Creating .env..."
cat > .env << 'ENVEOF'
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="CHANGE-THIS-TO-A-REAL-SECRET-IN-PRODUCTION"
AUTH_TRUST_HOST=true
STORAGE_DIR="./uploads"
SLA_DAYS_DEFAULT=40
NEXT_PUBLIC_APP_URL="http://LIGHTSAIL_IP:3000"
SMTP_FROM="Vigilance <vigilance@paytm.com>"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
GOOGLE_ALLOWED_DOMAIN="paytm.com"
ENVEOF

echo ""
echo "⚠️  IMPORTANT: Edit .env now to set:"
echo "   - AUTH_SECRET (generate with: openssl rand -base64 32)"
echo "   - NEXT_PUBLIC_APP_URL (your Lightsail IP)"
echo "   - AUTH_GOOGLE_ID & AUTH_GOOGLE_SECRET (for Google sign-in)"
echo ""

# 5. Install dependencies
echo "[5/8] Installing npm dependencies..."
npm install

# 6. Setup database + seed all data
echo ""
echo "[6/8] Setting up database with full seed data..."
npx prisma generate
npx prisma db push
npm run db:seed-all

# 7. Build Next.js
echo ""
echo "[7/8] Building Next.js app..."
npm run build

# 8. Start with PM2
echo ""
echo "[8/8] Starting app with PM2..."
mkdir -p uploads
pm2 start npm --name vigilance -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "========================================="
echo "  ✅ Deploy complete!"
echo "========================================="
echo ""
echo "App running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP'):3000"
echo ""
echo "Default login:"
echo "  Email:    admin@paytm.com"
echo "  Password: admin123"
echo ""
echo "Commands:"
echo "  pm2 logs vigilance    — view logs"
echo "  pm2 restart vigilance — restart app"
echo "  pm2 stop vigilance    — stop app"
echo ""
