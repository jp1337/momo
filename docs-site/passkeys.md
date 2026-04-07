---
layout: default
title: Passkeys
description: Sign in to Momo without a password using Face ID, Touch ID, Windows Hello or a hardware key.
---

# Passkeys — sign in without a password

A **passkey** is a modern replacement for passwords. Instead of typing something a stranger could steal, you prove who you are with your face, your fingerprint, your device PIN, or a hardware key you physically plug in. Passkeys never leave your device (or your device's encrypted cloud keychain), so there is nothing for an attacker to phish or dump from a database.

In Momo, a passkey can do two things:

1. **Sign you in without a password.** Tap *Sign in with a passkey* on the login page, authenticate with your face / finger / PIN, and you are on your dashboard. No GitHub round-trip, no email, no OAuth provider involved.
2. **Act as your second factor** — the alternative to an authenticator-app code. If you have both set up, you can pick whichever is more convenient at sign-in time.

Passkeys are **optional**, just like TOTP. Some Momo instances make a second factor mandatory for everyone; see the [2FA guide](two-factor-auth) for what that looks like.

---

## What you need

Any device that supports passkeys. Good news: most devices made in the last few years already do.

- **iPhone / iPad / Mac** — Face ID, Touch ID, or your device passcode. Passkeys sync across your Apple devices through iCloud Keychain.
- **Android phones** — your fingerprint or screen lock. Passkeys sync through Google Password Manager.
- **Windows 10 / 11** — Windows Hello (face, fingerprint, or PIN).
- **Linux** — works with a hardware key out of the box. Face/fingerprint support depends on your distribution.
- **Hardware keys** — YubiKey, SoloKey, Nitrokey, Feitian, Google Titan, and other FIDO2 keys work everywhere.
- **Password managers** — 1Password, Bitwarden, Proton Pass and others can store passkeys and sync them across all your devices too.

You do **not** need a password manager — the OS can handle it. But if you already use one, storing the passkey there means it follows you to every device the password manager knows about.

---

## Registering your first passkey

You need to be signed in to Momo before you can add a passkey. Sign in with your usual provider (GitHub, Google, Discord, …) first.

1. Click your avatar in the top-right corner and pick **Settings**.
2. Scroll to the section **Two-factor authentication**. Underneath the TOTP panel, there is a sub-section called **Passkeys**.
3. Click **Register a passkey**.
4. Momo asks you to give the passkey a name — for example *iPhone*, *Mac*, *Office YubiKey*. The default is a guess based on what you are using right now, but feel free to pick something memorable.
5. Your browser takes over and shows the OS prompt: *Use Face ID / Touch ID / PIN / insert your key*. Follow it.
6. The new passkey appears in the list. Done.

You can register as many passkeys as you like. A common setup is: one for your phone, one for your laptop, one YubiKey in a drawer at home as a backup.

---

## Signing in with a passkey (passwordless)

1. Open the Momo login page while you are signed out.
2. Click **Sign in with a passkey** (the top button, above GitHub / Google / Discord).
3. Your browser asks which passkey you want to use and prompts you to authenticate.
4. You are on your dashboard.

That's the whole flow. No email, no password, no OAuth.

> **Heads up:** if this is the first time you open Momo on a brand-new device that does not already have one of your synced passkeys (e.g. a friend's computer), passwordless sign-in will not find anything. In that case, sign in with your OAuth provider first, and optionally register an extra passkey for that device.

---

## Using a passkey as your second factor

If you already have an authenticator-app (TOTP) code set up and add a passkey on top, Momo shows **both** options at the second-factor screen: the code input, and a **Use a passkey instead** button. Pick whichever you prefer at any given time.

If you have **only** a passkey and no TOTP, the second-factor screen just shows the passkey button — no code input to distract you.

---

## Managing your passkeys

Open **Settings → Two-factor authentication → Passkeys**. For each registered passkey, you see:

- The **name** you gave it. Click **Rename** to change it.
- A badge: **Synced across devices** (the passkey is backed up to your cloud keychain) or **Bound to this device** (it lives only on this physical device or security key).
- The **last used** date, so you can see which credentials are active.
- A **Remove** button that revokes the passkey immediately.

Removing a passkey does not erase anything from your device — it just tells Momo to no longer accept it. You can register a new one at any time.

> **Note:** if the Momo instance requires a second factor for everyone (`REQUIRE_2FA`), the **Remove** button is hidden on your *last* remaining second factor. You need to register another passkey (or set up a TOTP code) before you can remove this one.

---

## I lost my device — what now?

This depends on your setup:

- **Your passkey was synced** (Synced across devices badge) → sign in from another device you own that also has the synced passkey. Go to Settings → Passkeys and **Remove** the lost device's entry if you want.
- **Your passkey was device-bound and you have other passkeys** → sign in with any of the others, then remove the lost one.
- **Your passkey was device-bound and it was your only second factor** → sign in with your OAuth provider and, if the instance does not enforce 2FA, you will land on the dashboard. Head to Settings → Passkeys, remove the lost entry, and register a new one.
- **You lost the only second factor on an instance with `REQUIRE_2FA`** → ask the instance operator. They can delete your passkey rows from the database so you can enroll again. See [the operator guide](https://github.com/jp1337/momo/blob/main/docs/environment-variables.md#two-factor-authentication-totp--passkeys).

---

## Frequently asked questions

**Is a passkey "safer" than a password?**
Yes, substantially. Passkeys cannot be phished (the browser only releases them to the exact domain they were created for), cannot be re-used across sites, and cannot be dumped in a data breach because Momo only stores a public key — the private part never leaves your device.

**Do I need a password manager?**
No. Your operating system can store and sync passkeys on its own. A password manager is just one extra option if you already use one.

**Can I use the same passkey on my phone *and* my Mac?**
Yes, if the passkey is stored in a synced keychain (iCloud Keychain, Google Password Manager, or a cross-device password manager). Hardware keys and "bound" platform passkeys stay on one device only.

**What happens if I lose my YubiKey?**
Exactly what happens if you lose your front door key — the key itself is gone, but you can use another way in. Register more than one passkey (or keep a TOTP code as backup), so losing one never locks you out completely.

**Do passkeys work with API keys / the Alexa skill?**
API keys (Personal Access Tokens) are a separate credential and are unaffected by passkeys. Alexa account linking uses an API key, so it keeps working exactly as before.

**Why does Momo not let me register a passkey on the `REQUIRE_2FA` setup screen?**
Currently the forced setup screen (`/setup/2fa`) only offers the TOTP wizard — we ask you to complete TOTP first so you are unblocked, then you can add passkeys from Settings. This is a deliberate scoping decision; it may change in a future release.

**Can I disable passkeys entirely on my instance?**
If you are a self-hoster, don't set `WEBAUTHN_RP_ID` and don't click "Register a passkey" — the feature is invisible to users who never use it, just like TOTP. You can also remove the entry from your `docs-site` navigation if you don't want users discovering it.

---

## See also

- [Two-Factor Authentication](two-factor-auth) — TOTP (authenticator-app) guide
- [Getting started](getting-started) — your first day with Momo
- [Self-hosting](self-hosting) — run your own Momo instance
