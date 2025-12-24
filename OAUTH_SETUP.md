# Email OAuth Setup Guide

## Required Environment Variables

Add these to your `.env` files:

### Gmail OAuth

```env
# Get these from Google Cloud Console
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/email/oauth/gmail/callback
```

### Microsoft OAuth

```env
# Get these from AzureAD Portal
MICROSOFT_CLIENT_ID=your-app-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/email/oauth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

### Base URL (for tracking)

```env
BASE_URL=http://localhost:3000
```

---

## Gmail OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Note the project ID

### 2. Enable Gmail API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure OAuth consent screen (if first time):
   - User Type: **External** (for testing)
   - App name: Your app name
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (your email address)
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Email Integration"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/email/oauth/gmail/callback`
     - `https://yourdomain.com/api/email/oauth/gmail/callback` (production)
7. Copy **Client ID** and **Client Secret**

### 4. Add to Environment Variables

```env
GMAIL_CLIENT_ID=123456789-abc...
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REDIRECT_URI=http://localhost:3000/api/email/oauth/gmail/callback
```

---

## Microsoft OAuth Setup

### 1. Register App in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Settings:
   - Name: "Email Integration"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: **Web** - `http://localhost:3000/api/email/oauth/microsoft/callback`
5. Click **Register**
6. Copy **Application (client) ID**

### 2. Create Client Secret

1. In your app, go to **Certificates & secrets**
2. Click **New client secret**
3. Description: "Email OAuth Secret"
4. Expires: Choose duration
5. Click **Add**
6. **Important:** Copy the secret **Value** immediately (shown only once)

### 3. Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these scopes:
   - `Mail.Read`
   - `Mail.Send`
   - `User.Read`
   - `offline_access` (for refresh tokens)
6. Click **Add permissions**
7. Click **Grant admin consent** (if admin)

### 4. Add Redirect URI

1. Go to **Authentication**
2. Under **Platform configurations** → **Web**
3. Add redirect URIs:
   - `http://localhost:3000/api/email/oauth/microsoft/callback`
   - `https://yourdomain.com/api/email/oauth/microsoft/callback` (production)
4. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens
5. Click **Save**

### 5. Add to Environment Variables

```env
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789012
MICROSOFT_CLIENT_SECRET=abc~...
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/email/oauth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

---

## Testing OAuth

### Gmail
1. Click "Connect Email" in channels page
2. Click "Gmail OAuth" button
3. Popup window opens with Google sign-in
4. Select your test account
5. Grant permissions
6. Popup closes, channel created!

### Microsoft
1. Click "Connect Email"
2. Click "Microsoft OAuth" button
3. Popup opens with Microsoft sign-in
4. Enter credentials
5. Accept permissions
6. Popup closes, channel created!

---

## Production Deployment

1. Update redirect URIs in OAuth apps:
   - Gmail: `https://yourdomain.com/api/email/oauth/gmail/callback`
   - Microsoft: `https://yourdomain.com/api/email/oauth/microsoft/callback`

2. Update environment variables:
   ```env
   GMAIL_REDIRECT_URI=https://yourdomain.com/api/email/oauth/gmail/callback
   MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/email/oauth/microsoft/callback
   BASE_URL=https://yourdomain.com
   ```

3. For Gmail: **Publish app** (move from testing to production)

4. For Microsoft: Remove test user restrictions if needed

---

## Troubleshooting

### Gmail: "Access blocked: This app's request is invalid"
- Ensure redirect URI exactly matches what's in Google Cloud Console
- Check that Gmail API is enabled
- Verify scopes are configured in OAuth consent screen

### Microsoft: "AADSTS50011: The redirect URI..."
- Redirect URI must match exactly (including http/https)
- Check that redirect URI is added in Authentication section

### "Origin mismatch" errors
- BASE_URL must match your application's domain
- Ensure window.postMessage origin check matches

### Refresh token not received
- Gmail: Use `prompt: 'consent'` in authorization URL
- Microsoft: Ensure `offline_access` scope is requested
