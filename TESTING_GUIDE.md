# Production Testing Guide

## Quick Start

### Prerequisites
- **Docker Desktop** - Required for running PostgreSQL, Redis, and the full stack
- **Node.js 20+** - For local development

### Option 1: Full Stack with Docker (Recommended)

1. **Install Docker Desktop**
   ```bash
   # Download from: https://www.docker.com/products/docker-desktop/
   # Or via Homebrew:
   brew install --cask docker
   ```

2. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in menu bar)

3. **Start all services**
   ```bash
   cd /Users/rajeshkumar/Documents/Automation\ Saas
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - API Docs: http://localhost:3001/api

5. **View logs**
   ```bash
   docker-compose logs -f api   # API logs
   docker-compose logs -f web   # Frontend logs
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

### Option 2: Local Development (Without Docker)

Requires manual PostgreSQL and Redis setup.

**Step 1: Install PostgreSQL**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb omnichannel
```

**Step 2: Install Redis**
```bash
brew install redis
brew services start redis
```

**Step 3: Set up environment**
```bash
cp .env.example .env
# Edit .env if needed
```

**Step 4: Run migrations**
```bash
cd apps/api
npm run migration:run
```

**Step 5: Start API**
```bash
cd apps/api
npm run start:dev
```

**Step 6: Start Frontend** (new terminal)
```bash
cd apps/web
npm run dev
```

---

## Test Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Create Tenant (First Setup)
```bash
curl -X POST http://localhost:3001/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "subdomain": "test",
    "email": "admin@test.com"
  }'
```

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin User",
    "tenantId": "<TENANT_ID>"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

---

## Platform Features to Test

### Phase 1: E-commerce
- [ ] Connect Shopify/WooCommerce store
- [ ] View orders dashboard
- [ ] View abandoned carts
- [ ] Test automation triggers

### Phase 2: Campaigns
- [ ] Create a segment
- [ ] Create a campaign
- [ ] Schedule campaign

### Phase 3: Deep Automation
- [ ] View customer health scores
- [ ] Check win-back candidates
- [ ] Test product recommendations

### Phase 4: AI
- [ ] Generate AI message
- [ ] Get lead scores
- [ ] Check next-best-actions

---

## Troubleshooting

### Docker Issues
```bash
# Reset Docker
docker-compose down -v
docker-compose up -d --build

# Check container status
docker ps

# Check logs
docker-compose logs api
```

### Database Issues
```bash
# Connect to PostgreSQL
docker exec -it omnichannel-db psql -U postgres -d omnichannel

# List tables
\dt

# Check contacts
SELECT * FROM contacts LIMIT 5;
```

### Redis Issues
```bash
# Connect to Redis
docker exec -it omnichannel-redis redis-cli

# Check keys
KEYS *
```
