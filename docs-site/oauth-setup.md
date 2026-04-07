---
layout: default
title: OAuth Setup
description: How to register OAuth apps for GitHub, Discord, Google, Microsoft (private accounts), and generic OIDC providers to use with Momo.
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

Replace `github` with `discord`, `google`, `microsoft-entra-id`, or `keycloak` for the other providers.

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

## Microsoft (private accounts only)

Lets users sign in with their personal Microsoft account — Outlook.com,
Hotmail, Live, Xbox, Skype.

> **Heads-up:** This integration only supports **personal** Microsoft accounts.
> Work / school accounts and Microsoft 365 / organisational Entra ID tenants
> are intentionally **not** supported. Momo pins the tenant to `consumers` in
> code, so even if you misconfigure the Azure app, work accounts will still be
> rejected at the Auth.js layer. If you need work-account login, use the
> [Generic OIDC](#generic-oidc-authentik-keycloak-zitadel-etc) provider with
> your tenant's issuer URL instead.

### 1. Open the Azure portal

Go to [portal.azure.com](https://portal.azure.com) and sign in with any
Microsoft account.

> A free personal Microsoft account is enough — you do **not** need an Azure
> subscription, a credit card, or any paid plan to register an app.

### 2. Create the app registration

1. In the top search bar, type **"App registrations"** and open it.
   (You may also see it labelled under "Microsoft Entra ID" → "App registrations".)
2. Click **+ New registration**.
3. Fill in:
   - **Name:** `Momo` (only visible to you and to users on the consent screen)
   - **Supported account types:**
     **Personal Microsoft accounts only** ← this is the important one
   - **Redirect URI:**
     - Platform: **Web**
     - URL: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
4. Click **Register**.

> For production, also add `https://your-domain.com/api/auth/callback/microsoft-entra-id`
> on the **Authentication** page after registration. Microsoft allows multiple
> redirect URIs per app, so you can run dev + prod from a single registration.

### 3. Copy the Application (client) ID

On the app's **Overview** page, copy the value labelled
**Application (client) ID**. This is your `MICROSOFT_CLIENT_ID`.

> You can ignore the **Directory (tenant) ID** — Momo pins the tenant to
> `consumers` in code, so this value is not used.

### 4. Create a client secret

1. In the left sidebar, open **Certificates & secrets**.
2. Tab **Client secrets** → **+ New client secret**.
3. Description: `Momo` · Expires: pick whatever you're comfortable with.
   (Microsoft caps secrets at 24 months — set a calendar reminder to rotate.)
4. Click **Add**.
5. **Immediately copy the value in the `Value` column** (NOT the `Secret ID`!).
   The Value is shown only once — if you navigate away you have to create a
   new one. This is your `MICROSOFT_CLIENT_SECRET`.

### 5. Set the env vars

In `.env.local` (or your production secret store):

```env
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

### 6. Restart Momo

Restart the dev server / redeploy the container. The "Continue with Microsoft"
button now appears on the login page and as a linkable account in
**Settings → Connected accounts**.

### Troubleshooting

- **`unauthorized_client` / `AADSTS700016`** — the redirect URI in Azure does
  not match `<NEXTAUTH_URL>/api/auth/callback/microsoft-entra-id` exactly.
  Trailing slashes and `http` vs `https` matter.
- **"Account does not exist in directory consumers"** — you tried to log in
  with a work or school account. Use a personal one (outlook.com, hotmail.com,
  live.com, xbox).
- **"Invalid client secret"** — you probably copied the *Secret ID* instead of
  the *Value*. Go back to **Certificates & secrets**, create a new secret,
  and copy the **Value** column this time.

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
| Microsoft (private) | `https://your-domain.com/api/auth/callback/microsoft-entra-id` |
| OIDC | `https://your-domain.com/api/auth/callback/keycloak` |

Also update your environment variables:

```env
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```
