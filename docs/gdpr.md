# DSGVO Compliance Guide

This document describes how Momo implements DSGVO (GDPR) requirements and what operators of self-hosted instances need to configure.

> **Note:** This document provides technical guidance, not legal advice. Operators are responsible for ensuring their specific deployment is legally compliant. When in doubt, consult a legal professional or use a service like [E-Recht24](https://www.e-recht24.de).

---

## Implemented User Rights

| DSGVO Article | Right | Implementation |
|---|---|---|
| Art. 17 | Right to erasure ("Recht auf Löschung") | Settings → Delete account — immediately and permanently deletes all user data via CASCADE |
| Art. 15 + 20 | Right of access + data portability | Settings → Export data — downloads all personal data as a structured JSON file |

---

## Data Processing Overview

### What Momo stores

| Data | Source | Purpose | Legal basis (Art. 6) |
|---|---|---|---|
| Name, email, avatar | OAuth provider (GitHub / Discord / Google) | User identification, profile display | Art. 6(1)(b) — contract performance |
| Tasks, topics, notes | User input | Core app functionality | Art. 6(1)(b) — contract performance |
| Wishlist items | User input | Wishlist feature | Art. 6(1)(b) — contract performance |
| Coins, level, streak, achievements | App logic | Gamification | Art. 6(1)(b) — contract performance |
| Notification settings | User preference | Daily reminders | Art. 6(1)(b) — contract performance |
| Session token | Auth.js | Authentication | Art. 6(1)(b) — contract performance |

### What Momo does NOT store

- Payment data
- Location data
- Device fingerprints or advertising IDs
- Analytics or behavioral tracking data
- Third-party tracking cookies

### Third parties

OAuth providers receive requests during the login flow. They process data according to their own privacy policies:
- GitHub: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- Discord: https://discord.com/privacy
- Google: https://policies.google.com/privacy

---

## Cookies

Momo uses only technically necessary cookies. **No cookie banner or consent is required** under the ePrivacy Directive Art. 5(3).

| Cookie | Purpose | Duration |
|---|---|---|
| `next-auth.session-token` | Authentication session | 30 days (or until logout) |
| `locale` | UI language preference | 1 year |

No analytics, tracking, or advertising cookies.

---

## Legal Pages

Both pages are automatically generated from environment variables and are accessible without authentication.

### Impressum (`/impressum`)

Required under **§ 5 TMG** for any publicly accessible website operated from Germany (or targeting German users).

Configure with:

```bash
NEXT_PUBLIC_IMPRINT_NAME="Your Full Name"
NEXT_PUBLIC_IMPRINT_ADDRESS="Street, Postcode City"
NEXT_PUBLIC_IMPRINT_EMAIL="contact@example.com"
NEXT_PUBLIC_IMPRINT_PHONE="+49 ..."   # optional but recommended
```

### Datenschutzerklärung (`/datenschutz`)

Required under **DSGVO Art. 13** whenever personal data is collected.

The page uses a pre-written boilerplate suitable for an OAuth-only app without tracking.
Operator name and contact are inserted from the same `NEXT_PUBLIC_IMPRINT_*` variables.

**The boilerplate covers:**
- Identity of the data controller
- Categories of personal data processed
- Legal basis (Art. 6(1)(b) — contract performance)
- OAuth third-party data transfer
- Cookie list (session + locale)
- Data storage and deletion
- User rights (Art. 15–22)
- Data export feature
- Contact for data protection inquiries
- Right to lodge a complaint with a supervisory authority

**What operators should review and potentially adapt:**
- Server/hosting location (if stored outside EU/EEA, additional transfer safeguards apply)
- Data retention periods (how long inactive accounts are kept)
- If additional features are added (e.g., analytics, payments), the policy must be extended

---

## Data Deletion — Technical Details

When a user deletes their account (`DELETE /api/user`):

1. The `users` row is deleted from PostgreSQL.
2. All related data is automatically deleted via `ON DELETE CASCADE` foreign keys:
   - `tasks`
   - `topics`
   - `task_completions`
   - `wishlist_items`
   - `user_achievements`
   - `sessions` (Auth.js sessions)
   - `accounts` (OAuth account links)
3. Deletion is immediate and irreversible.
4. The user is signed out after deletion.

---

## Data Export — Technical Details

`GET /api/user/export` returns a JSON file with:

```json
{
  "exportedAt": "ISO 8601 timestamp",
  "version": "1",
  "profile": { ... },
  "topics": [ ... ],
  "tasks": [ ... ],
  "taskCompletions": [ ... ],
  "wishlistItems": [ ... ],
  "achievements": [ ... ]
}
```

**Deliberately excluded from export:**
- OAuth access/refresh tokens (rotated externally, not personal data in a portable sense)
- Session tokens (transient internal state)
- Push subscription endpoint (browser-side, not portable)

Rate limit: 5 exports per hour per user.

---

## Self-Hosted Operator Checklist

- [ ] Set `NEXT_PUBLIC_IMPRINT_NAME`, `NEXT_PUBLIC_IMPRINT_ADDRESS`, `NEXT_PUBLIC_IMPRINT_EMAIL`
- [ ] Verify `/impressum` and `/datenschutz` are accessible without login
- [ ] Review the Datenschutzerklärung template — adapt server location and retention policies
- [ ] Ensure database backups are secured and access-controlled
- [ ] Ensure HTTPS is enforced (HSTS is already configured in `next.config.ts`)
- [ ] If using a cloud provider, check whether a Data Processing Agreement (DPA) is needed
