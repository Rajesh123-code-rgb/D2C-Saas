# Hostinger VPS Deployment Guide

Complete step-by-step guide for deploying the OmniChannel SaaS Platform to Hostinger VPS.

---

## Prerequisites

- **Hostinger VPS** (KVM 2 or higher recommended)
- **Domain** with DNS access
- **GitHub account** (for CI/CD)

---

## Quick Start

### 1. Purchase & Configure VPS

1. Purchase a Hostinger VPS (Ubuntu 22.04 LTS)
2. Set a strong root password
3. Note your VPS IP address

### 2. Configure DNS Records

In Hostinger DNS Zone Manager, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | YOUR_VPS_IP | 3600 |
| A | app | YOUR_VPS_IP | 3600 |

Wait 5-10 minutes for DNS propagation.

### 3. Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 4. Clone & Deploy

```bash
# Clone repository
git clone https://github.com/yourusername/automation-saas.git /opt/omnichannel
cd /opt/omnichannel

# Make scripts executable
chmod +x scripts/*.sh

# Run deployment setup
./scripts/deploy.sh
```

### 5. Configure Environment

```bash
# Edit environment file with your values
nano /opt/omnichannel/.env
```

**Required values to update:**
- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `SESSION_SECRET` - Generate with `openssl rand -hex 32`
- `API_URL` - Your API domain (https://api.yourdomain.com)
- `FRONTEND_URL` - Your app domain (https://app.yourdomain.com)
- Meta/WhatsApp credentials
- Stripe credentials
- Email service credentials

### 6. Setup SSL Certificates

```bash
# Update domains in script first, then run:
./scripts/setup-ssl.sh
```

### 7. Start Application

```bash
cd /opt/omnichannel
docker compose -f docker-compose.prod.yml up -d
```

### 8. Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml exec api npm run migration:run
docker compose -f docker-compose.prod.yml exec api npm run seed
```

### 9. Start Nginx

```bash
systemctl restart nginx
```

### 10. Verify Deployment

```bash
curl https://api.yourdomain.com/api
curl https://app.yourdomain.com
```

---

## GitHub Actions CI/CD Setup

### Required Secrets

Add these secrets in GitHub → Repository → Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `VPS_SSH_PRIVATE_KEY` | SSH private key for VPS access |
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username (usually `root`) |
| `API_DOMAIN` | api.yourdomain.com |
| `APP_DOMAIN` | app.yourdomain.com |

### Generate SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR_VPS_IP

# Add private key content to GitHub secret VPS_SSH_PRIVATE_KEY
cat ~/.ssh/id_ed25519
```

---

## Useful Commands

### View Logs

```bash
# All containers
docker compose -f docker-compose.prod.yml logs -f

# Specific container
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Manual Backup

```bash
./scripts/backup.sh
```

### Check Container Status

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.prod.yml logs api
```

### Database connection issues
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_isready
```

### SSL certificate issues
```bash
certbot certificates
certbot renew --dry-run
```

### High memory usage
```bash
docker stats
```

---

## Support

- **Logs**: `/opt/omnichannel/logs/`
- **Backups**: `/opt/omnichannel/backups/`
- **Nginx config**: `/etc/nginx/sites-available/omnichannel`
