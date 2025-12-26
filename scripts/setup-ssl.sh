#!/bin/bash
# =============================================================================
# OmniChannel SaaS Platform - SSL Certificate Setup Script
# Uses Let's Encrypt via Certbot for free SSL certificates
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE
DOMAIN_API="api.convoo.cloud"
DOMAIN_APP="app.convoo.cloud"
EMAIL="admin@convoo.cloud"  # For Let's Encrypt notifications

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL Certificate Setup for OmniChannel${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create webroot directory for ACME challenges
mkdir -p /var/www/certbot

# Stop Nginx temporarily for standalone certificate generation
echo -e "${YELLOW}Stopping Nginx for certificate generation...${NC}"
systemctl stop nginx 2>/dev/null || true

# Generate certificate for API domain
echo -e "${YELLOW}Generating SSL certificate for ${DOMAIN_API}...${NC}"
certbot certonly --standalone \
    -d ${DOMAIN_API} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# Generate certificate for App domain
echo -e "${YELLOW}Generating SSL certificate for ${DOMAIN_APP}...${NC}"
certbot certonly --standalone \
    -d ${DOMAIN_APP} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# Start Nginx
echo -e "${YELLOW}Starting Nginx...${NC}"
systemctl start nginx

# Set up automatic renewal
echo -e "${YELLOW}Setting up automatic certificate renewal...${NC}"

# Add renewal hook to reload Nginx
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Add cron job for renewal (if not exists)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
    echo -e "${GREEN}Added cron job for certificate renewal${NC}"
fi

# Test renewal process
echo -e "${YELLOW}Testing certificate renewal...${NC}"
certbot renew --dry-run

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Certificates installed at:"
echo -e "  API: /etc/letsencrypt/live/${DOMAIN_API}/"
echo -e "  App: /etc/letsencrypt/live/${DOMAIN_APP}/"
echo ""
echo -e "Automatic renewal is configured via cron."
echo -e "Certificates will be renewed automatically before expiry."
