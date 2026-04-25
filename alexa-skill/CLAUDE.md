# alexa-skill/

## Purpose
Standalone AWS Lambda project that powers the Momo Alexa Skill. Completely separate from the Next.js app — own `package.json`, own `tsconfig.json`, own `node_modules`. The Lambda calls back into the Momo REST API using a per-user API key obtained via Account Linking.

## Tech Stack
- AWS Lambda (Node.js 20)
- `ask-sdk-core` for the Alexa Skills Kit handler model
- `node-fetch` (or native fetch on Node 20) for HTTP calls back to `https://momotask.app/api/*`

## Structure
```
src/
  index.ts            → Lambda entry point, registers all handlers + builds the SkillBuilder
  momo-client.ts      → Thin REST client around the Momo API (Bearer token from Account Linking)
  handlers/
    launch.ts             → "Alexa, open Momo" — welcome response
    add-task.ts           → AddTaskIntent — POST /api/tasks
    add-wishlist-item.ts  → AddWishlistItemIntent — POST /api/wishlist
    get-quest.ts          → GetQuestIntent — GET /api/daily-quest
    list-tasks.ts         → ListTasksIntent — GET /api/tasks
    help.ts               → AMAZON.HelpIntent
    cancel-stop.ts        → AMAZON.CancelIntent + AMAZON.StopIntent
    error.ts              → Generic error handler (last in chain)
models/
  de-DE.json          → German interaction model (intents, slots, sample utterances)
  en-US.json          → English interaction model
skill.json            → Skill manifest (publishing info, account linking config)
deploy.zip            → Output of `npm run build && npm run zip` — uploaded to Lambda
```

User-facing setup guide lives at `docs-site/alexa-skill.md` (published at jp1337.github.io/momo/alexa-skill).

## Patterns
- Each intent gets its own file in `handlers/` exporting a single `RequestHandler`
- All handlers go through `momo-client.ts` for HTTP — never call `fetch` directly inside a handler
- Account Linking is OAuth 2.0 Implicit Grant via `GET /api/alexa/auth` on the Momo backend; the Lambda receives the bearer token via `handlerInput.requestEnvelope.context.System.user.accessToken`
- Locale is read from `handlerInput.requestEnvelope.request.locale` and used to pick German vs English response strings

## When to touch this directory
- Adding a new intent → new file under `handlers/`, new entry in both `models/*.json`, register in `src/index.ts`
- Changing API client behaviour → `src/momo-client.ts`
- Updating sample utterances → `models/{de-DE,en-US}.json`
- **Do NOT** touch this directory when working on the Next.js app — they share no code

## Skip these (already in .claudeignore)
- `dist/` — compiled JavaScript output
- `node_modules/` — Lambda dependencies
- `package-lock.json` — auto-managed
- `deploy.zip` — build artifact
