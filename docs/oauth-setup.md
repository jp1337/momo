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

## Microsoft (private accounts only)

Lets users sign in with their personal Microsoft account (Outlook.com, Hotmail,
Live, Xbox, Skype). **Work or school accounts (Microsoft 365, organisational
Entra ID tenants) are not supported by this integration** — that is an
intentional restriction. Momo pins the tenant to `consumers` in `lib/auth.ts`,
so even if the Azure app were misconfigured to allow work accounts, Auth.js
will only honour the consumer endpoint.

### 1. Open the Azure portal

Go to <https://portal.azure.com> and sign in with any Microsoft account.
A free personal account is enough — you do **not** need an Azure subscription
or paid plan to register an app.

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
       (for production add `https://yourdomain.tld/api/auth/callback/microsoft-entra-id` later)
4. Click **Register**.

### 3. Copy the Application (client) ID

On the app's **Overview** page, copy the value labelled
**Application (client) ID** — this is your `MICROSOFT_CLIENT_ID`.

> You can ignore the "Directory (tenant) ID" — Momo pins the tenant to
> `consumers` in code, so this value is not used.

### 4. Create a client secret

1. In the left sidebar, open **Certificates & secrets**.
2. Tab **Client secrets** → **+ New client secret**.
3. Description: `Momo` · Expires: pick whatever you're comfortable with
   (Microsoft caps secrets at 24 months — set a calendar reminder to rotate).
4. Click **Add**.
5. **Immediately copy the `Value` column** (NOT the `Secret ID`).
   This value is shown only once — if you navigate away you have to create a new one.
   This is your `MICROSOFT_CLIENT_SECRET`.

### 5. Set the env vars

In `.env.local` (or your production secret store):

```env
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<the Value from step 4>
```

### 6. Restart Momo

Restart the dev server / redeploy the container. The "Continue with Microsoft"
button now appears on `/login` and as a linkable account in
**Settings → Connected accounts**.

### Troubleshooting

- **`unauthorized_client` / `AADSTS700016`** — the redirect URI in Azure does
  not match `<NEXTAUTH_URL>/api/auth/callback/microsoft-entra-id` exactly.
  Trailing slashes and `http` vs `https` matter.
- **"Account does not exist in directory consumers"** — you tried to log in
  with a work or school account. Use a personal one (outlook.com, hotmail.com,
  live.com).
- **"Invalid client secret"** — you probably copied the *Secret ID* instead of
  the *Value*. Create a new secret and copy the Value column.

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
