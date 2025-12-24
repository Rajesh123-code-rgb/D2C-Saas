# OmniChannel SaaS Platform

> Enterprise-grade Omnichannel Communication, Marketing & Automation SaaS Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## 🚀 Overview

A complete multi-tenant SaaS platform that enables businesses to manage **WhatsApp**, **Instagram**, and **Email** communication, run marketing campaigns, create advanced automations, manage e-commerce workflows, and operate a unified CRM — all from one platform.

### Key Features

✅ **Unified Inbox** - Manage all customer conversations across WhatsApp, Instagram, and Email in one place  
✅ **Advanced CRM** - Unified customer profiles with lifecycle stages, tags, and custom fields  
✅ **Visual Automation Builder** - No-code automation flows with triggers, conditions, and actions  
✅ **Marketing Campaigns** - Template-based WhatsApp campaigns, email broadcasts, and Instagram DM automation  
✅ **E-commerce Integration** - Shopify and WooCommerce webhook support for order automation  
✅ **Multi-tenant Architecture** - Secure, isolated tenants with role-based access control  
✅ **Real-time Updates** - WebSocket-powered live messaging and notifications  
✅ **Meta Compliant** - WhatsApp Business Platform and Instagram Business API integration

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** and **Docker Compose**
- **PostgreSQL** 16+ (managed by Docker)
- **Redis** 7+ (managed by Docker)

---

## 🏗️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **ShadCN UI** - High-quality React components
- **Socket.IO Client** - Real-time WebSocket client
- **React Flow** - Visual automation builder
- **Recharts** - Analytics dashboards

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeORM** - ORM for PostgreSQL
- **PostgreSQL** - Primary database
- **Redis** - Caching and message queues
- **BullMQ** - Background job processing
- **Passport JWT** - Authentication
- **Socket.IO** - WebSocket server

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd omnichannel-saas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

**Important Variables** (update these in `.env`):

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omnichannel

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Meta / WhatsApp (Get from Meta Developer Portal)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_VERIFY_TOKEN=your-webhook-verify-token
```

### 4. Start with Docker

Start all services (PostgreSQL, Redis, API, Web):

```bash
npm run docker:up
```

This will start:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Backend API** on port `3001`
- **Frontend Web** on port `3000`

### 5. Run Migrations

```bash
npm run db:migrate
```

### 6. (Optional) Seed Demo Data

```bash
npm run db:seed
```

### 7. Access the Platform

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs (Swagger)

---

## 📁 Project Structure

```
omnichannel-saas/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Authentication & Authorization
│   │   │   │   ├── tenants/    # Multi-tenant management
│   │   │   │   ├── users/      # User management
│   │   │   │   ├── contacts/   # CRM / Contacts
│   │   │   │   ├── inbox/      # Unified Inbox
│   │   │   │   └── channels/
│   │   │   │       ├── whatsapp/    # WhatsApp integration
│   │   │   │       ├── instagram/   # Instagram integration
│   │   │   │       └── email/       # Email integration
│   │   │   ├── config/         # Configuration
│   │   │   ├── database/       # Migrations & Seeds
│   │   │   ├── main.ts         # Application entry
│   │   │   └── app.module.ts   # Root module
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── web/                    # Next.js Frontend
│       ├── app/
│       │   ├── (auth)/         # Auth pages (login, signup)
│       │   ├── (app)/          # Authenticated app pages
│       │   │   ├── dashboard/
│       │   │   ├── inbox/
│       │   │   ├── contacts/
│       │   │   ├── campaigns/
│       │   │   ├── automations/
│       │   │   └── settings/
│       │   └── page.tsx        # Landing page
│       ├── components/
│       │   ├── ui/             # ShadCN UI components
│       │   └── ...
│       ├── lib/                # Utilities & API client
│       ├── package.json
│       └── Dockerfile
│
├── packages/                   # Shared packages (future)
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment template
├── package.json                # Root package.json
└── README.md                   # This file
```

---

## 🔐 Authentication Flow

### Signup

**Endpoint**: `POST /api/v1/auth/signup`

```json
{
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp",
  "companySlug": "acme-corp"
}
```

**Response**:
```json
{
  "user": { /* user object */ },
  "tenant": { /* tenant object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

**Endpoint**: `POST /api/v1/auth/login`

```json
{
  "email": "john@example.com",
  "password": "SecureP@ss123"
}
```

---

## 📡 WhatsApp Integration

### Setup Steps

1. **Create Meta App**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create a new app with WhatsApp product
   - Get your `APP_ID` and `APP_SECRET`

2. **Configure Webhook**
   - Set webhook URL: `https://your-domain.com/api/v1/whatsapp/webhook`
   - Set verify token (same as `META_VERIFY_TOKEN` in `.env`)
   - Subscribe to: `messages`, `message_delivery`, `message_read`

3. **Embedded Signup**
   - Create an Embedded Signup configuration
   - Get the `config_id`
   - Add to `.env` as `META_EMBEDDED_SIGNUP_CONFIG_ID`

4. **Connect WhatsApp**
   - Navigate to Channels > WhatsApp in the app
   - Click "Connect WhatsApp Business"
   - Follow Meta's embedded signup flow

---

## 🛠️ Development

### Run Backend Only

```bash
npm run dev:api
```

### Run Frontend Only

```bash
npm run dev:web
```

### Run Both (Recommended)

```bash
npm run dev
```

### View Docker Logs

```bash
npm run docker:logs
```

### Stop Docker Services

```bash
npm run docker:down
```

---

## 📊 Database Schema

### Core Entities

- **tenants** - Multi-tenant isolation
- **users** - User accounts with roles
- **contacts** - Unified customer profiles
- **channels** - Channel configurations (WhatsApp, Instagram, Email)
- **conversations** - Multi-channel conversations
- **messages** - All messages across channels
- **automation_flows** - Automation definitions (coming soon)
- **campaigns** - Marketing campaigns (coming soon)

---

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
```

### Run E2E Tests

```bash
npm run test:e2e
```

---

## 📦 Deployment

### Production Build

Backend:
```bash
npm run build:api
```

Frontend:
```bash
npm run build:web
```

### Environment Variables for Production

Ensure you set these in your production environment:

```bash
NODE_ENV=production
DATABASE_URL=<your-production-db-url>
REDIS_URL=<your-production-redis-url>
JWT_SECRET=<strong-random-secret>
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
```

---

## 🗺️ Roadmap

### MVP (Phase 1) - ✅ In Progress
- [x] Infrastructure & Multi-tenancy
- [x] Authentication & RBAC
- [x] Database schema & entities
- [x] Unified Inbox backend
- [/] WhatsApp Cloud API integration
- [ ] Landing page
- [ ] App UI (Dashboard, Inbox, Contacts, Settings)

### Phase 2 - Coming Soon
- [ ] Instagram Business Messaging
- [ ] Email integration (SendGrid/SES)
- [ ] Automation Engine
- [ ] Marketing Campaigns
- [ ] Analytics Dashboard

### Phase 3 - Future
- [ ] E-commerce integrations (Shopify, WooCommerce)
- [ ] AI-powered automation
- [ ] Advanced analytics
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For issues and questions:
- Open an [issue](https://github.com/your-repo/issues)
- Email: support@yourdomain.com

---

## 🙏 Acknowledgements

- [NestJS](https://nestjs.com/)
- [Next.js](https://nextjs.org/)
- [Meta for Developers](https://developers.facebook.com/)
- [ShadCN UI](https://ui.shadcn.com/)
- [TypeORM](https://typeorm.io/)

---

**Built with ❤️ for modern businesses**
