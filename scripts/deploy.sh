#!/bin/bash
# =============================================================================
# OmniChannel SaaS Platform - Main Deployment Script for Hostinger VPS
# Automates complete deployment setup
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - UPDATE THESE VALUES
APP_DIR="/opt/omnichannel"
REPO_URL="https://github.com/Rajesh123-code-rgb/D2C-Saas.git"  # Update this
DOMAIN_API="api.convoo.cloud"   # Update this
DOMAIN_APP="app.convoo.cloud"   # Update this

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OmniChannel SaaS - Hostinger VPS Deploy${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================================================
# Pre-flight Checks
# =============================================================================
echo -e "${YELLOW}Step 1: Running pre-flight checks...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    echo -e "  OS: $OS $VER"
else
    echo -e "${RED}Cannot detect OS. This script is designed for Ubuntu/Debian.${NC}"
    exit 1
fi

# =============================================================================
# Install System Dependencies
# =============================================================================
echo -e "${YELLOW}Step 2: Installing system dependencies...${NC}"

apt-get update -qq
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

echo -e "${GREEN}✓ System dependencies installed${NC}"

# =============================================================================
# Install Docker
# =============================================================================
echo -e "${YELLOW}Step 3: Installing Docker...${NC}"

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# =============================================================================
# Install Nginx
# =============================================================================
echo -e "${YELLOW}Step 4: Installing Nginx...${NC}"

if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi

# =============================================================================
# Install Certbot
# =============================================================================
echo -e "${YELLOW}Step 5: Installing Certbot...${NC}"

if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# =============================================================================
# Configure Firewall
# =============================================================================
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "${GREEN}✓ Firewall configured (SSH, HTTP, HTTPS allowed)${NC}"

# =============================================================================
# Create Application Directory
# =============================================================================
echo -e "${YELLOW}Step 7: Setting up application directory...${NC}"

mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/backups/postgres
mkdir -p ${APP_DIR}/backups/redis
mkdir -p ${APP_DIR}/logs/api
mkdir -p ${APP_DIR}/logs/nginx
mkdir -p ${APP_DIR}/uploads
mkdir -p /var/www/certbot

echo -e "${GREEN}✓ Application directories created${NC}"

# =============================================================================
# Clone/Update Repository
# =============================================================================
echo -e "${YELLOW}Step 8: Cloning repository...${NC}"

if [ -d "${APP_DIR}/.git" ]; then
    cd ${APP_DIR}
    git pull origin main
    echo -e "${GREEN}✓ Repository updated${NC}"
else
    git clone ${REPO_URL} ${APP_DIR}
    echo -e "${GREEN}✓ Repository cloned${NC}"
fi

cd ${APP_DIR}

# =============================================================================
# Environment Configuration
# =============================================================================
echo -e "${YELLOW}Step 9: Checking environment configuration...${NC}"

if [ ! -f "${APP_DIR}/.env" ]; then
    if [ -f "${APP_DIR}/.env.production.example" ]; then
        cp ${APP_DIR}/.env.production.example ${APP_DIR}/.env
        echo -e "${YELLOW}⚠ Created .env from template. Please edit with your values!${NC}"
        echo -e "${YELLOW}  Run: nano ${APP_DIR}/.env${NC}"
    else
        echo -e "${RED}✗ No .env file found and no template available!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Environment file exists${NC}"
fi

# =============================================================================
# Configure Nginx
# =============================================================================
echo -e "${YELLOW}Step 10: Configuring Nginx...${NC}"

# Update domain names in nginx config
sed -i "s/api.yourdomain.com/${DOMAIN_API}/g" ${APP_DIR}/nginx/nginx.conf
sed -i "s/app.yourdomain.com/${DOMAIN_APP}/g" ${APP_DIR}/nginx/nginx.conf

# Copy nginx config
cp ${APP_DIR}/nginx/nginx.conf /etc/nginx/sites-available/omnichannel
ln -sf /etc/nginx/sites-available/omnichannel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config (will fail initially due to missing SSL certs, that's OK)
nginx -t 2>/dev/null || echo -e "${YELLOW}⚠ Nginx config test failed - SSL certs needed${NC}"

echo -e "${GREEN}✓ Nginx configured${NC}"

# =============================================================================
# Build Docker Images
# =============================================================================
echo -e "${YELLOW}Step 11: Building Docker images...${NC}"

cd ${APP_DIR}
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${GREEN}✓ Docker images built${NC}"

# =============================================================================
# Setup Backup Cron Job
# =============================================================================
echo -e "${YELLOW}Step 12: Setting up automated backups...${NC}"

chmod +x ${APP_DIR}/scripts/backup.sh
chmod +x ${APP_DIR}/scripts/setup-ssl.sh

# Add backup cron job if not exists
if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
    (crontab -l 2>/dev/null; echo "0 2 * * * ${APP_DIR}/scripts/backup.sh >> ${APP_DIR}/logs/backup.log 2>&1") | crontab -
    echo -e "${GREEN}✓ Backup cron job added (runs daily at 2 AM)${NC}"
else
    echo -e "${GREEN}✓ Backup cron job already exists${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Configure environment variables:${NC}"
echo -e "   nano ${APP_DIR}/.env"
echo ""
echo -e "2. ${YELLOW}Set up SSL certificates:${NC}"
echo -e "   ${APP_DIR}/scripts/setup-ssl.sh"
echo ""
echo -e "3. ${YELLOW}Start the application:${NC}"
echo -e "   cd ${APP_DIR}"
echo -e "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "4. ${YELLOW}Run database migrations:${NC}"
echo -e "   docker compose -f docker-compose.prod.yml exec api npm run migration:run"
echo ""
echo -e "5. ${YELLOW}Seed admin user:${NC}"
echo -e "   docker compose -f docker-compose.prod.yml exec api npm run seed"
echo ""
echo -e "6. ${YELLOW}Start Nginx:${NC}"
echo -e "   systemctl restart nginx"
echo ""
echo -e "7. ${YELLOW}Verify deployment:${NC}"
echo -e "   curl https://${DOMAIN_API}/api"
echo -e "   curl https://${DOMAIN_APP}"
echo ""
echo -e "${GREEN}Application Directory: ${APP_DIR}${NC}"
echo -e "${GREEN}Logs: ${APP_DIR}/logs${NC}"
echo -e "${GREEN}Backups: ${APP_DIR}/backups${NC}"
