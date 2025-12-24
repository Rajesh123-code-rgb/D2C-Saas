# Deployment & Production Guide

## Overview

This guide covers deploying the OmniChannel SaaS Platform to production, including infrastructure setup, environment configuration, security hardening, and monitoring.

---

## 🏗️ Infrastructure Requirements

### Minimum Server Specifications

**Production Environment**:
- **Web Server**: 2 vCPU, 4GB RAM
- **API Server**: 4 vCPU, 8GB RAM
- **Database**: 4 vCPU, 8GB RAM, 100GB SSD
- **Redis**: 2 vCPU, 4GB RAM

**Recommended for Scale**:
- Load balancer (NLB/ALB)
- Auto-scaling groups
- Multi-AZ database setup
- CDN for static assets

### Services Needed

1. **Compute**: AWS EC2, Digital Ocean Droplets, or Google Cloud Compute
2. **Database**: AWS RDS PostgreSQL, managed PostgreSQL
3. **Cache**: AWS ElastiCache Redis, managed Redis
4. **Storage**: AWS S3 for media files
5. **Email**: SendGrid, AWS SES, or Mailgun
6. **Monitoring**: Datadog, New Relic, or AWS CloudWatch
7. **SSL**: Let's Encrypt or AWS Certificate Manager

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Simple)

Best for: Small teams, MVP, development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd automation-saas

# 2. Copy and configure environment
cp .env.example .env
nano .env

# 3. generate SSL certificates
certbot certonly --standalone -d api.yourdomain.com
certbot certonly --standalone -d app.yourdomain.com

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker-compose exec api npm run migration:run

# 6. Create first admin user
docker-compose exec api npm run seed:admin
```

### Option 2: Kubernetes (Enterprise)

Best for: Enterprise, high-scale, multi-region

**Prerequisites**:
- Kubernetes cluster (EKS, GKE, AKS)
- kubectl configured
- Helm installed

```bash
# 1. Create namespace
kubectl create namespace omnichannel-prod

# 2. Set up secrets
kubectl create secret generic omnichannel-secrets \
  --from-env-file=.env.prod \
  -n omnichannel-prod

# 3. Deploy with Helm
helm install omnichannel ./helm \
  --namespace omnichannel-prod \
  --values values.prod.yaml

# 4. Run migrations
kubectl exec -it deployment/omnichannel-api \
  -n omnichannel-prod -- npm run migration:run
```

### Option 3: Cloud Platform (Managed)

**AWS**:
- Elastic Beanstalk for API
- Amplify for Frontend
- RDS for PostgreSQL
- ElastiCache for Redis

**Vercel** (Frontend):
```bash
npm install -g vercel
cd apps/web
vercel --prod
```

**Render** (Backend):
- Connect GitHub repo
- Select Node.js
- Set build command: `cd apps/api && npm install && npm run build`
- Set start command: `cd apps/api && npm run start:prod`

---

## 🔐 Environment Configuration

### Production `.env`

```env
# DO NOT commit this file to version control!

# Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@db-prod.amazonaws.com:5432/omnichannel
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://cache-prod.amazonaws.com:6379
REDIS_TLS=true

# API
API_PORT=3001
API_URL=https://api.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com,https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# JWT
JWT_SECRET=<generate-64-char-random-string>
JWT_EXPIRATION=7d
SESSION_SECRET=<generate-64-char-random-string>

# Meta/WhatsApp
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
META_VERIFY_TOKEN=<your-verify-token>
META_WEBHOOK_URL=https://api.yourdomain.com/api/v1/whatsapp/webhook

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>
EMAIL_FROM=noreply@yourdomain.com

# Stripe
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# File Storage
AWS_REGION=us-east-1
AWS_S3_BUCKET=omnichannel-prod-files
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Feature Flags
FEATURE_INSTAGRAM=true
FEATURE_EMAIL=true
FEATURE_CAMPAIGNS=true
FEATURE_AUTOMATION=true
```

### Generating Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using openssl
openssl rand -hex 32
```

---

## 🔒 Security Hardening

### 1. SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Database Security

```sql
-- Create read-only user for reporting
CREATE USER readonly_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE omnichannel TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Enable row-level security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 3. Rate Limiting

```typescript
// In main.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

### 4. Input Validation

```typescript
// Already implemented with class-validator
// Ensure all DTOs have proper validation

// Example: apps/api/src/modules/auth/dto/signup.dto.ts
@IsEmail()
@IsNotEmpty()
email: string;

@IsStrongPassword()
@MinLength(8)
password: string;
```

---

## 📊 Database Migrations

### Initial Setup

```bash
# Generate initial migration
npm run migration:generate -- -n InitialSchema

# Run migrations
npm run migration:run

# Revert if needed
npm run migration:revert
```

### Migration Strategy

1. **Development**: auto-sync enabled (`synchronize: true`)
2. **Staging**: run migrations manually
3. **Production**: **NEVER** use auto-sync, always use migrations

### Backup Before Migration

```bash
# Backup database
pg_dump -h db-prod.amazonaws.com -U postgres omnichannel > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
npm run migration:run

# If issues, restore
psql -h db-prod.amazonaws.com -U postgres omnichannel < backup_20241216_010000.sql
```

---

## 📈 Monitoring & Logging

### 1. Application Monitoring (Sentry)

```typescript
// In main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Error tracking
app.use(Sentry.Handlers.errorHandler());
```

### 2. Performance Monitoring

```typescript
// Custom metrics
import { Counter, Histogram } from 'prom-client';

const messagesSent = new Counter({
  name: 'whatsapp_messages_sent_total',
  help: 'Total WhatsApp messages sent',
  labelNames: ['status'],
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
});
```

### 3. Log Aggregation

```typescript
// Use structured logging
import { Logger } from '@nestjs/common';

const logger = new Logger('WhatsAppService');

logger.log('Message sent', {
  messageId: '12345',
  to: '+1234567890',
  tenantId: 'tenant-uuid',
  timestamp: new Date().toISOString(),
});
```

**Log Levels**:
- `error`: Critical errors
- `warn`: Warnings
- `log`: Important events
- `debug`: Debugging info (disable in production)
- `verbose`: Detailed logs (disable in production)

---

## 🚨 Backup Strategy

### Database Backups

```bash
# Daily automated backups
0 2 * * * pg_dump -h db-prod.amazonaws.com -U postgres omnichannel | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

### File Backups (S3)

```bash
# S3 versioning enabled
aws s3api put-bucket-versioning \
  --bucket omnichannel-prod-files \
  --versioning-configuration Status=Enabled

# Lifecycle policy (archive after 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket omnichannel-prod-files \
  --lifecycle-configuration file://lifecycle.json
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests
        run: npm test
      
      - name: Build Docker images
        run: |
          docker build -t omnichannel-api:latest ./apps/api
          docker build -t omnichannel-web:latest ./apps/web
      
      - name: Push to registry
        run: |
          docker push omnichannel-api:latest
          docker push omnichannel-web:latest
      
      - name: Deploy to production
        run: |
          ssh production "cd /app && docker-compose pull && docker-compose up -d"
      
      - name: Run migrations
        run: |
          ssh production "cd /app && docker-compose exec -T api npm run migration:run"
      
      - name: Health check
        run: |
          curl -f https://api.yourdomain.com/health || exit 1
```

---

## ✅ Pre-Launch Checklist

### Infrastructure
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Database backups automated
- [ ] Redis persistence configured
- [ ] CDN configured for static assets
- [ ] Load balancer set up (if using)
- [ ] DNS records configured
- [ ] Firewall rules configured

### Security
- [ ] All secrets using strong, unique values
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Helmet security headers configured

### Application
- [ ] Environment variables set correctly
- [ ] Database migrations run
- [ ] Seed data created (if needed)
- [ ] Meta App approved for production
- [ ] Stripe in live mode
- [ ] Email service verified
- [ ] Webhooks configured
- [ ] Error monitoring (Sentry) active

### Performance
- [ ] Database indexes created
- [ ] Query optimization done
- [ ] Caching strategy implemented
- [ ] Static assets optimized
- [ ] Image compression enabled
- [ ] Gzip compression enabled

### Monitoring
- [ ] Application monitoring configured
- [ ] Database monitoring configured
- [ ] Uptime monitoring configured
- [ ] Log aggregation configured
- [ ] Alerting rules set up
- [ ] Dashboard created

### Legal & Compliance
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] GDPR compliance verified
- [ ] Data retention policies defined
- [ ] Cookie consent implemented

---

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check connection
psql -h db-prod.amazonaws.com -U postgres -d omnichannel

# Check SSL requirement
# Add to DATABASE_URL: ?sslmode=require
```

**2. Redis Connection Issues**
```bash
# Test Redis
redis-cli -h cache-prod.amazonaws.com ping

# Check TLS
redis-cli -h cache-prod.amazonaws.com --tls ping
```

**3. WhatsApp Webhook Not Receiving**
- Verify webhook URL is publicly accessible
- Check firewall allows Meta IPs
- Verify SSL certificate is valid
- Check webhook subscription in Meta dashboard

**4. High Memory Usage**
```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/main.js

# Monitor memory
pm2 monit
```

---

## 📞 Support & Maintenance

### Daily Tasks
- Check error logs
- Review monitoring dashboards
- Verify backups completed

### Weekly Tasks
- Review performance metrics
- Check security alerts
- Update dependencies (security patches)

### Monthly Tasks
- Review usage and costs
- Optimize database queries
- Clean up old data
- Review and update documentation

---

## 🎯 Performance Optimization

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_messages_conversation_timestamp ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone);
```

### Caching
```typescript
// Cache frequently accessed data
const cachedUser = await redis.get(`user:${userId}`);
if (cachedUser) return JSON.parse(cachedUser);

const user = await userRepository.findOne({ where: { id: userId } });
await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
```

### Query Optimization
```typescript
// Use select to limit fields
const users = await userRepository.find({
  select: ['id', 'email', 'firstName', 'lastName'],
  where: { tenantId },
});

// Use pagination
const [users, total] = await userRepository.findAndCount({
  skip: (page - 1) * limit,
  take: limit,
});
```

---

## 📚 Additional Resources

- [NestJS Production Best Practices](https://docs.nestjs.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Best Practices](https://redis.io/topics/introduction)
- [Meta WhatsApp API](https://developers.facebook.com/docs/whatsapp)

---

**Status**: Production-ready with comprehensive deployment guidelines and best practices.
