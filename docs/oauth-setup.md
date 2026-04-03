# OAuth Setup Guide

This guide walks you through setting up OAuth providers for Momo.

## Callback URL Pattern

All providers use the same callback URL pattern:

```
<NEXTAUTH_URL>/api/auth/callback/<provider>
```

Examples:
- `http://localhost:3000/api/auth/callback/github`
- `https://momotask.app/api/auth/callback/discord`

---

## GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Momo
   - **Homepage URL:** `http://localhost:3000` (or your production URL)
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**
6. Add to `.env.local`:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

---

## Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** — name it "Momo"
3. Go to **OAuth2** in the sidebar
4. Under **Redirects**, click **Add Redirect**:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```
5. Copy the **Client ID** from the **General Information** page
6. Click **Reset Secret** and copy the **Client Secret**
7. Add to `.env.local`:
   ```env
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   ```

---

## Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Copy the **Client ID** and **Client Secret**
8. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

---

## Generic OIDC (Authentik, Keycloak, Zitadel, etc.)

OIDC login is activated automatically when `OIDC_ISSUER` is set.

1. In your OIDC provider, create a new OAuth2/OIDC application
2. Set the redirect URI to:
   ```
   http://localhost:3000/api/auth/callback/keycloak
   ```
   > **Note:** The path segment `keycloak` is Auth.js's internal identifier for the generic OIDC provider — it does not mean you must use Keycloak. Use this exact path regardless of which OIDC provider you choose (Authentik, Zitadel, etc.).
3. Copy the **Client ID**, **Client Secret**, and **Issuer URL**
4. Add to `.env.local`:
   ```env
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_ISSUER=https://auth.example.com/application/o/momo/
   ```

The OIDC button on the login page will appear automatically once `OIDC_ISSUER` is configured.
