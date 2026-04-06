# Alexa Skill

AWS Lambda function that connects Amazon Alexa to the Momo REST API.
Source code lives in `alexa-skill/`.

---

## Architecture

```
Alexa Skills Kit
    ↓  (HTTPS invoke)
AWS Lambda — Node.js 20 (ask-sdk-core)
    ↓  (fetch + Bearer token)
Momo REST API (POST /api/tasks, GET /api/daily-quest, etc.)
```

Authentication: the user's Momo API key is stored as the Alexa `accessToken` via Account Linking and injected into every Lambda request envelope at `context.System.user.accessToken`.

---

## Project Structure

```
alexa-skill/
  src/
    index.ts                  ← Lambda entry point — .lambda() handler
    momo-client.ts            ← Typed fetch wrapper for Momo API
    handlers/
      launch.ts               ← LaunchRequest ("Alexa, open Momo")
      add-task.ts             ← AddTaskIntent
      add-wishlist-item.ts    ← AddWishlistItemIntent
      get-quest.ts            ← GetQuestIntent
      list-tasks.ts           ← ListTasksIntent
      help.ts                 ← AMAZON.HelpIntent
      cancel-stop.ts          ← AMAZON.CancelIntent / StopIntent
      error.ts                ← Global error handler
  models/
    de-DE.json                ← German interaction model
    en-US.json                ← English interaction model
  skill.json                  ← Skill manifest
  SETUP.md                    ← End-user setup guide (step-by-step)
  .env.example                ← Lambda environment variables
```

---

## Build

```bash
cd alexa-skill
npm install
npm run zip        # → deploy.zip (esbuild bundle + zip)
```

esbuild bundles all dependencies into a single `dist/index.js`. `aws-sdk` is excluded (`--external:aws-sdk`) since it is pre-installed in the Lambda runtime.

---

## OAuth Account Linking Endpoint

`GET /api/alexa/auth` — implemented in `app/api/alexa/auth/route.ts`.

Implements OAuth 2.0 Implicit Grant for Alexa Account Linking:

1. Validates `response_type=token` and `redirect_uri` against known Amazon domains
2. Checks Auth.js session — redirects to `/login` if unauthenticated
3. Creates a new API key named `"Alexa"` for the user via `createApiKey()`
4. Redirects to `redirect_uri#access_token=<key>&token_type=Bearer&state=<state>`

Allowed `redirect_uri` domains:
- `https://layla.amazon.com`
- `https://pitangui.amazon.com`
- `https://alexa.amazon.co.jp`

---

## Adding a New Intent

1. Add handler in `alexa-skill/src/handlers/<name>.ts` — implement `canHandle` + `handle`
2. Export and register in `alexa-skill/src/index.ts` via `.addRequestHandlers(...)`
3. Add API method to `alexa-skill/src/momo-client.ts` if a new endpoint is needed
4. Add intent + samples + dialog slot (if needed) to `alexa-skill/models/de-DE.json`
5. Run `npm run zip` → upload `deploy.zip` to Lambda
6. Rebuild the Alexa interaction model in the Developer Console

**Important:** All string literals in handlers must use plain ASCII quotes. German typographic quotes (`„` `"`) inside TypeScript string literals cause `tsc` parse errors.

---

## Environment Variables (Lambda)

| Variable | Default | Description |
|---|---|---|
| `MOMO_API_BASE_URL` | `https://momotask.app` | Base URL of the Momo instance (no trailing slash) |

---

## Supported Intents

| Intent | Slot | API Call |
|---|---|---|
| `AddTaskIntent` | `taskName` (SearchQuery) | `POST /api/tasks` |
| `AddWishlistItemIntent` | `itemName` (SearchQuery) | `POST /api/wishlist` |
| `GetQuestIntent` | — | `GET /api/daily-quest` |
| `ListTasksIntent` | — | `GET /api/tasks` |
| `AMAZON.HelpIntent` | — | Static response |
| `AMAZON.CancelIntent` / `AMAZON.StopIntent` | — | Session end |
