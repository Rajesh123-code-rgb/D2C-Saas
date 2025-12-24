# API Integration Guide

## Status

✅ **Frontend** is connected to backend API via centralized API client  
⚠️ **Backend** needs to be started for full functionality

---

## What's Working Now

### Frontend (Running on http://localhost:3000)

1. **Landing Page** - Fully functional
2. **Signup/Login Pages** - Connected to API client
3. **Dashboard** - Protected route with auth check
4. **API Client** - Centralized axios instance with:
   - Auto token injection
   - Error handling
   - 401 redirect to login
   - localStorage management

### Backend (Needs to be started)

Backend API is built but not currently running because Docker is not installed on your system.

---

## How to Start Backend

You have two options:

### Option 1: Install Docker (Recommended)

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop
3. Run backend:
   ```bash
   cd "/Users/rajeshkumar/Documents/Automation Saas"
   npm run docker:up
   ```

This will start:
- PostgreSQL database
- Redis
- NestJS Backend API

### Option 2: Run Backend Manually (Without Docker)

If you have PostgreSQL and Redis installed locally:

1. Set up PostgreSQL:
   ```bash
   createdb omnichannel
   ```

2. Start Redis:
   ```bash
   redis-server
   ```

3. Update `.env` with local connection strings:
   ```env
   DATABASE_URL=postgresql://youruser:yourpass@localhost:5432/omnichannel
   REDIS_URL=redis://localhost:6379
   ```

4. Run backend:
   ```bash
   npm run dev:api
   ```

---

## Testing Full Flow (Once Backend is Running)

### 1. Signup Flow

1. Visit http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Fill the form:
   - First Name: John
   - Last Name: Doe
   - Email: test@demo.com
   - Password: Test@123456
   - Company Name: Demo Company
   - Company Slug: (auto-generated as `demo-company`)
4. Click "Create Account"
5. You should be redirected to `/dashboard`

### 2. Login Flow

1. Visit http://localhost:3000/login
2. Enter credentials:
   - Email: test@demo.com
   - Password: Test@123456
3. Click "Sign In"
4. You should be redirected to `/dashboard`

### 3. Dashboard

- See stats cards (will be 0 initially)
- See getting started guide
- Navigate using sidebar
- Logout button in profile section

---

## API Client Usage

The API client is located in `apps/web/lib/api.ts` and can be used anywhere in the frontend:

```typescript
import { api } from '@/lib/api';

// Signup
await api.signup(formData);

// Login
await api.login({ email, password });

// Get contacts
const contacts = await api.getContacts();

// Get conversations
const conversations = await api.getConversations();

// Logout
api.logout();
```

The client automatically:
- Adds Bearer token to all requests
- Redirects to login on 401
- Stores user/tenant data in localStorage
- Handles errors gracefully

---

## Current Limitations

### Without Backend Running:

- ❌ Cannot create real accounts
- ❌ Cannot login with credentials
- ❌ Cannot fetch data from database
- ✅ Can still browse UI (landing, signup form, dashboard layout)

### With Backend Running:

- ✅ Full authentication flow
- ✅ Create/login accounts
- ✅ Protected routes work
- ✅ Store data in database
- ✅ Real-time WebSocket updates

---

## Frontend State Management

Currently using localStorage for auth state:
- `token` - JWT token
- `user` - User object (id, email, name, role)
- `tenant` - Tenant object (id, name, slug)

This is checked in the app layout and redirects to login if missing.

---

## Next Steps

###To Complete MVP:

1. **Install Docker** and start backend
2. **Test full authentication flow** (signup → login → dashboard)
3. **Build Inbox UI** with real data from API
4. **Build Contacts UI** with data table
5 **Connect WhatsApp** via Meta Cloud API

---

## Troubleshooting

### "Cannot connect to backend"

- Check if backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env` (should be `http://localhost:3001`)
- Check browser console for network errors

### "401 Unauthorized"

- Token expired or invalid
- Click logout and login again

### "CORS errors"

- Backend needs to allow frontend origin
- Check `CORS_ORIGIN` in backend `.env`

---

## API Endpoints Available

Once backend is running:

**Auth**:
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/login` - Login

**Contacts**:
- `GET /api/v1/contacts` - List contacts
- `GET /api/v1/contacts/:id` - Get contact

**Inbox**:
- `GET /api/v1/inbox/conversations` - List conversations
- `GET /api/v1/inbox/conversations/:id` - Get conversation
- `GET /api/v1/inbox/conversations/:id/messages` - Get messages
- `PATCH /api/v1/inbox/conversations/:id/status` - Update status
- `PATCH /api/v1/inbox/conversations/:id/assign` - Assign agent

**Documentation**:
- Visit http://localhost:3001/api/docs for Swagger UI

---

## Summary

✅ Frontend and backend are connected via API client  
✅ Authentication flow is implemented  
✅ Protected routes working  
⏸️ Backend needs Docker to run  
🎯 Ready for full testing once backend starts!
