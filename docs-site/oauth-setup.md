---
layout: default
title: OAuth Setup
description: How to register OAuth apps for GitHub, Discord, Google, and generic OIDC providers to use with Momo.
---

# OAuth Setup

Momo uses OAuth for authentication — you sign in with an account you already have. This guide walks through registering an OAuth app for each supported provider.

You only need to configure one provider, but you can configure all of them for maximum flexibility.

---

## Callback URL Pattern

All providers use the same callback URL pattern:

```
<NEXTAUTH_URL>/api/auth/callback/<provider>
```

Examples:
- `http://localhost:3000/api/auth/callback/github` (local development)
- `https://momo.example.com/api/auth/callback/github` (production)

Replace `github` with `discord`, `google`, or `keycloak` for the other providers.

---

## GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - **Application name:** Momo (or any name you like)
   - **Homepage URL:** `http://localhost:3000` (or your production URL)
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy the secret immediately (it won't be shown again)
7. Add to `.env.local`:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

> For production, create a separate OAuth App with your production domain as the callback URL. GitHub does not allow multiple callback URLs per app.

---

## Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name it "Momo"
3. Go to **OAuth2** in the left sidebar
4. Under **Redirects**, click **Add Redirect** and enter:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```
5. Click **Save Changes**
6. Copy the **Client ID** from the top of the **OAuth2** page
7. Click **Reset Secret**, confirm, and copy the **Client Secret**
8. Add to `.env.local`:
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
5. If prompted, configure the OAuth consent screen first:
   - User type: **External**
   - App name: Momo
   - Add your domain to authorized domains
6. Choose **Web application** as the application type
7. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
8. Click **Create**
9. Copy the **Client ID** and **Client Secret** from the popup
10. Add to `.env.local`:
    ```env
    GOOGLE_CLIENT_ID=your-client-id
    GOOGLE_CLIENT_SECRET=your-client-secret
    ```

> Google requires your OAuth app to be verified for production use with external users. During development, you can add yourself as a test user in the consent screen settings.

---

## Generic OIDC (Authentik, Keycloak, Zitadel, etc.)

OIDC login is activated automatically when `OIDC_ISSUER` is set. Use this for self-hosted identity providers.

### Authentik

1. In the Authentik admin panel, go to **Applications → Providers**
2. Click **Create** → **OAuth2/OpenID Connect Provider**
3. Configure:
   - **Name:** Momo
   - **Authorization flow:** default-provider-authorization-implicit-consent
   - **Redirect URIs:** `http://localhost:3000/api/auth/callback/keycloak`
4. Copy the **Client ID** and **Client Secret** from the provider page
5. The issuer URL is: `https://authentik.example.com/application/o/momo/`
6. Add to `.env.local`:
   ```env
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_ISSUER=https://authentik.example.com/application/o/momo/
   ```

### Keycloak

1. In the Keycloak admin console, go to your realm → **Clients**
2. Click **Create client**
3. Configure:
   - **Client type:** OpenID Connect
   - **Client ID:** momo
4. On the next screen, enable **Client authentication**
5. Under **Valid redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/keycloak
   ```
6. Go to **Credentials** tab and copy the **Client Secret**
7. The issuer URL is: `https://keycloak.example.com/realms/your-realm`
8. Add to `.env.local`:
   ```env
   OIDC_CLIENT_ID=momo
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_ISSUER=https://keycloak.example.com/realms/your-realm
   ```

### Any OIDC Provider

The general pattern:

```env
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER=https://your-provider.example.com/
```

The OIDC provider must expose a discovery document at `<OIDC_ISSUER>/.well-known/openid-configuration`.

The OIDC login button appears on the sign-in page automatically once `OIDC_ISSUER` is set.

---

## Production Callback URLs

When deploying to production, register your production domain as the callback URL in each provider's settings:

| Provider | Production Callback URL |
|---|---|
| GitHub | `https://your-domain.com/api/auth/callback/github` |
| Discord | `https://your-domain.com/api/auth/callback/discord` |
| Google | `https://your-domain.com/api/auth/callback/google` |
| OIDC | `https://your-domain.com/api/auth/callback/keycloak` |

Also update your environment variables:

```env
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```
