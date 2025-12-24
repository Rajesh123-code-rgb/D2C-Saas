# 🚀 Getting Started with OmniChannel SaaS Platform

## ✅ What's Been Built So Far

### Backend (NestJS) - COMPLETE
✅ **Infrastructure**
- Docker Compose with PostgreSQL, Redis, API, and Web services
- Multi-tenant database architecture (schema-per-tenant design)
- TypeORM entities and migrations foundation
- BullMQ job queue setup
- WebSocket server configuration

✅ **Authentication & Authorization**
- JWT-based authentication
- Signup endpoint (creates tenant + owner user)
- Login endpoint with password validation
- Role-based access control (Owner, Admin, Agent, Viewer)
- Protected route guards
- Current user decorator

✅ **Core Modules**
- **Tenants Module**: Multi-tenant management with subscription tiers
- **Users Module**: User management with roles and status
- **Contacts Module**: Unified CRM with search, tags, lifecycle stages
- **Inbox Module**: Multi-channel conversation management
- **Messages Module**: All message types across channels
- **Channels Module**: WhatsApp, Instagram, Email configuration

✅ **Real-time Features**
- WebSocket Gateway for inbox
- Typing indicators
- New message notifications
- Tenant-based room isolation

✅ **API Documentation**
- Swagger/OpenAPI at `/api/docs`
- Comprehensive endpoint documentation

### Frontend (Next.js) - IN PROGRESS
✅ **Configuration**
- Next.js 14 with App Router
- TailwindCSS + ShadCN UI design system
- TypeScript configuration
- Path aliases for clean imports

🚧 **Pending**
- Landing page
- Authentication pages (login, signup)
- App dashboard
- Inbox UI
- CRM/Contacts UI
- Settings pages

---

## 📋 Prerequisites

Make sure you have these installed:

✅ **Node.js** >= 18.0.0  
✅ **npm** >= 9.0.0  
✅ **Docker Desktop** (includes Docker & Docker Compose)

### Verify Installations

```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
docker --version
docker-compose --version
```

---

## 🏁 Step-by-Step Installation

### Step 1: Install Dependencies

```bash
cd "/Users/rajeshkumar/Documents/Automation Saas"
npm install
```

This will install all dependencies for the monorepo including backend and frontend.

### Step 2: Review Environment Variables

The `.env` file has been created from `.env.example`. Review and update these critical values:

```bash
# Open .env file and update:
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this

# For WhatsApp (get from Meta Developer Portal later):
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_VERIFY_TOKEN=create-a-random-string-here
```

⚠️ **Security Note**: Change the JWT_SECRET and SESSION_SECRET to random, strong values!

### Step 3: Start Services with Docker

```bash
npm run docker:up
```

This command will:
1. Start PostgreSQL database (port 5432)
2. Start Redis (port 6379)
3. Build and start the NestJS API (port 3001)
4. Build and start the Next.js web app (port 3000)

**First-time startup may take 3-5 minutes** as Docker builds the images.

### Step 4: Verify Services Are Running

Check Docker logs:
```bash
npm run docker:logs
```

You should see:
- ✅ PostgreSQL ready to accept connections
- ✅ Redis server ready
- ✅ NestJS API running on port 3001
- ✅ Next.js running on port 3000

### Step 5: Run Database Migrations

In a new terminal:
```bash
cd "/Users/rajeshkumar/Documents/Automation Saas"
npm run db:migrate
```

This will create all database tables (tenants, users, contacts, conversations, messages, channels).

### Step 6: Access the Platform

Open your browser and visit:

- **API Server**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Frontend**: http://localhost:3000

---

## 🧪 Testing the API

### 1. Create an Account (Signup)

Using curl or Postman:

```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test@123456",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Test Company",
    "companySlug": "test-company"
  }'
```

**Response** (copy the `token`):
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "owner",
    ...
  },
  "tenant": {
    "id": "uuid",
    "name": "Test Company",
    "slug": "test-company",
    "subscriptionTier": "free"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

### 2. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test@123456"
  }'
```

### 3. Get Contacts (Protected Route)

Use the token from signup/login:

```bash
curl -X GET http://localhost:3001/api/v1/contacts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Inbox Conversations

```bash
curl -X GET http://localhost:3001/api/v1/inbox/conversations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔧 Development Workflow

### Run Backend Only

```bash
npm run dev:api
```

API will be available at http://localhost:3001

### Run Frontend Only

```bash
npm run dev:web
```

Frontend will be available at http://localhost:3000

### Run Both (Concurrently)

```bash
npm run dev
```

### View Docker Logs

```bash
npm run docker:logs
```

### Stop All Services

```bash
npm run docker:down
```

---

## 📂 Project Structure Explained

```
/Users/rajeshkumar/Documents/Automation Saas/
│
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # ✅ JWT authentication, signup, login
│   │   │   │   ├── tenants/    # ✅ Multi-tenant management
│   │   │   │   ├── users/      # ✅ User CRUD with RBAC
│   │   │   │   ├── contacts/   # ✅ CRM / Contact management
│   │   │   │   ├── inbox/      # ✅ Unified inbox + WebSocket
│   │   │   │   └── channels/   # 🚧 Channel integrations
│   │   │   │       └── whatsapp/  # 🚧 WhatsApp Cloud API
│   │   │   ├── main.ts         # ✅ Bootstrap with Swagger
│   │   │   └── app.module.ts   # ✅ Root module
│   │   └── package.json
│   │
│   └── web/                    # Next.js Frontend
│       ├── app/
│       │   ├── globals.css     # ✅ Tailwind + theme variables
│       │   └── layout.tsx      # ✅ Root layout
│       ├── components/         # 🚧 UI components (to be added)
│       ├── lib/                # 🚧 API client (to be added)
│       └── package.json
│
├── docker-compose.yml          # ✅ Multi-service orchestration
├── .env                        # ✅ Environment configuration
├── .env.example                # ✅ Template
├── package.json                # ✅ Root monorepo config
└── README.md                   # ✅ Main documentation
```

---

## ✅ What Works Right Now

1. **Multi-tenant signup**: Creates a new company (tenant) + owner user
2. **Authentication**: JWT-based login with role-based access
3. **Protected APIs**: All endpoints require valid JWT token
4. **Contacts API**: Create, search, and manage customer contacts
5. **Inbox API**: Multi-channel conversation management
6. **WebSocket**: Real-time inbox updates (connect to ws://localhost:3001/inbox)
7. **Swagger Docs**: Interactive API documentation

---

## 🚧 What's Next (Frontend Development)

### Immediate Next Steps:

1. **Landing Page** - Hero, features, pricing sections
2. **Auth Pages** - Beautiful login and signup forms
3. **App Dashboard** - Main dashboard with metrics
4. **Inbox UI** - 3-column layout (conversations, messages, contact info)
5. **Contacts UI** - CRM table with search and filters
6. **Settings** - User management, channels, billing

### WhatsApp Integration:

1. Complete WhatsApp webhook service
2. Implement Meta Embedded Signup flow
3. Message sending with template support
4. Catalog sharing

**Current Status**: Backend infrastructure is ~60% complete for MVP. Frontend is ~5% complete.

---

## 🐛 Troubleshooting

### Docker containers won't start

```bash
# Clean up and restart
npm run docker:down
docker system prune -a
npm run docker:up
```

### Port already in use

If ports 3000, 3001, 5432, or 6379 are in use:

```bash
# Find and kill processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:5432 | xargs kill -9
lsof -ti:6379 | xargs kill -9
```

### Database connection errors

Check PostgreSQL is running:
```bash
docker ps | grep postgres
```

Verify connection:
```bash
docker exec -it omnichannel-db psql -U postgres -d omnichannel
```

### API returns 401 Unauthorized

Make sure you're sending the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 📝 Next Development Session

When you return to development, follow this checklist:

1. ✅ Pull latest code
2. ✅ Run `npm install` (if package.json changed)
3. ✅ Start Docker: `npm run docker:up`
4. ✅ Check logs: `npm run docker:logs`
5. ✅ Continue building frontend or WhatsApp integration

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Meta for Developers - WhatsApp](https://developers.facebook.com/docs/whatsapp)
- [TypeORM Documentation](https://typeorm.io/)
- [ShadCN UI Components](https://ui.shadcn.com/)

---

**Need help?** Check the main [README.md](./README.md) for more details.

**Ready to continue?** Start with creating the landing page or authentication UI! 🚀
