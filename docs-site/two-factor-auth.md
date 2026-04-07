---
layout: default
title: Two-Factor Authentication
description: Protect your Momo account with an authenticator app on top of your OAuth login.
---

# Two-Factor Authentication

Two-factor authentication (2FA) adds a second lock to your Momo account. Even if someone steals your GitHub, Google, Discord or Microsoft password, they still can not get into Momo without the 6-digit code that lives only on your phone.

It is **optional** for you personally — you can turn it on whenever you like. Some Momo instances make it mandatory for everyone; we will explain how that looks below.

---

## What you need

An **authenticator app** on your phone (or password manager). Any app that supports the standard "TOTP" format works. We recommend, in no particular order:

- **Aegis Authenticator** (Android, free, open source) — our top pick if you use Android
- **2FAS** (iOS, Android, free, open source)
- **Google Authenticator** (iOS, Android)
- **Authy** (iOS, Android, desktop, with cloud sync)
- **1Password**, **Bitwarden**, **Proton Pass** — if you already use a password manager that supports TOTP, that works too

Avoid SMS-based "2FA" codes — they are not the same thing and not supported by Momo.

---

## Turning 2FA on

1. Sign in to Momo as usual.
2. Click your avatar in the top-right corner and pick **Settings**.
3. Scroll to the section **Two-factor authentication** and click **Enable 2FA**.
4. A wizard appears with a QR code. Open your authenticator app, tap "Add account" (or the equivalent), and scan the QR code. Your app will start showing a 6-digit code that changes every 30 seconds.
   - If you cannot scan the QR code (e.g. you set up Momo on the same phone that has the authenticator app), tap the manual entry key shown below the QR code and type it into your app instead.
5. Type the current 6-digit code from your app into Momo and click **Activate**.
6. Momo shows you **10 backup codes**. **Save them now** — see the next section.

That's it. From now on, every new sign-in asks for a code.

---

## Backup codes

Backup codes are your safety net. If you lose your phone, your authenticator app gets wiped, or you just forget to take it with you on holiday, a backup code will let you sign in **once** in place of the 6-digit code.

You get 10 codes the moment you enable 2FA. Each code only works once.

**Where to keep them:**

- ✅ In a **password manager** (1Password, Bitwarden, Proton Pass, KeePass…) — usually the easiest and safest option.
- ✅ **Printed on paper** and stored somewhere you would also keep your passport — a desk drawer at home, a safe, or with a trusted family member.
- ❌ **Not** in a plain text file on your computer's desktop.
- ❌ **Not** in an email to yourself.
- ❌ **Not** as a screenshot in your phone's photo gallery.

You can download the codes as a `.txt` file from the wizard, or copy them all to your clipboard with one click.

If you ever run out of codes (or want to refresh them), open **Settings → Two-factor authentication** and click **Regenerate backup codes**. The old codes stop working immediately.

---

## Signing in with 2FA

After 2FA is on, every new sign-in works like this:

1. Click your usual provider button (GitHub, Google, Discord, …) and sign in.
2. Momo shows a screen titled **Two-factor authentication** with a single input field.
3. Open your authenticator app, find the Momo entry, and type the current 6-digit code. Momo submits automatically once you finish typing.
4. You land on your dashboard.

If you do not have your phone with you, click **Use a backup code instead** below the input field and type one of your saved backup codes. That code is then consumed — you cannot use it again.

---

## Turning 2FA off

If you want to remove 2FA from your account:

1. Open **Settings → Two-factor authentication**.
2. Click **Disable 2FA**.
3. Type a current 6-digit code from your authenticator app to confirm. (This stops a stranger who has briefly grabbed your laptop from disabling 2FA without knowing the code.)
4. Momo deletes the secret and all your backup codes.

You can re-enable 2FA at any time — you will just go through the setup wizard again.

> **Note:** if your Momo instance has 2FA enforced (see below), the **Disable** button is hidden and the action is blocked. You will need to ask the instance operator to remove 2FA from your account directly.

---

## Mandatory 2FA (instance-wide)

Some self-hosted Momo instances are set up to require 2FA for everybody — this is controlled by the operator with an environment variable called `REQUIRE_2FA`.

If you sign in to such an instance and have not enabled 2FA yet, you will be sent straight to a setup screen titled **Set up two-factor authentication**. The screen has only one job: to walk you through the wizard. Until you finish, you cannot reach the dashboard, your tasks, settings, or anything else. The only escape is the small **Sign out** link in the corner.

This sounds drastic, but it is over in about a minute:

1. Open your authenticator app, scan the QR code.
2. Type the first 6-digit code.
3. Save your backup codes.
4. Tick the "I have stored the backup codes safely" box.
5. Click **Continue to the dashboard**.

Done. From the next sign-in onwards, you are in the normal flow with the regular 6-digit prompt.

---

## What if I lose everything?

If you lose your phone **and** your backup codes, there is no self-serve recovery — neither Momo nor anyone else can read your authenticator secret out of the database, because it is encrypted with a key only the server knows.

**On the public instance (momotask.app):** open a GitHub issue at [github.com/jp1337/momo](https://github.com/jp1337/momo) and we will help you recover.

**On a self-hosted instance:** ask whoever runs that instance. They can clear the 2FA columns on your account directly in the database (see the technical guide [here](https://github.com/jp1337/momo/blob/main/docs/two-factor-auth.md#recovery-for-a-locked-out-user) — there is a short SQL snippet they can run).

After recovery, sign in normally and re-enroll your authenticator app.

---

## Frequently asked questions

**Will I have to type a code every time I open Momo?**
No. Only when you sign in fresh. If you stay signed in, the code is asked once per session, not every page load.

**Does 2FA work with the Momo Alexa skill / API keys?**
Yes — they are unaffected. API keys (Personal Access Tokens) are themselves a separate credential, so Momo treats them as already-second-factored. You do not have to type a code into Alexa.

**Why does Momo not just use SMS codes?**
SMS-based 2FA is widely considered weaker than authenticator apps because phone numbers can be hijacked via SIM swapping, and operators can intercept messages. Authenticator apps generate codes locally on your device with no network involved.

**Can I use a hardware key (YubiKey) or a Face ID / Touch ID passkey?**
Yes — Momo supports **Passkeys (WebAuthn)** as well. Passkeys work with Face ID, Touch ID, Windows Hello, Android biometrics, iCloud Keychain and hardware security keys like a YubiKey. You can use a passkey *instead* of an authenticator-app code, or in addition to it. Passkeys also enable **passwordless sign-in** — once registered, you can sign in with just your fingerprint or device PIN, without going through GitHub / Google / Discord at all. See [the Passkey guide](passkeys) for setup.

**My code keeps being rejected even though I just typed it.**
Authenticator codes are time-based, so if your phone's clock or your server's clock is wrong, codes will not match. Most apps have a "Sync time" option in the settings — try that first. Momo allows ±30 seconds of clock drift, but anything beyond that will fail.

**I see "Too many attempts" — what now?**
Momo limits 2FA verification to 5 attempts per 5 minutes per account to slow down anyone guessing. Wait a few minutes and try again. If you typed your codes carefully and still see this, double-check that you are entering the code from the **Momo** entry in your app and not a different account.

---

## See also

- [Features overview](features) — everything else Momo can do
- [Getting started](getting-started) — your first day with Momo
- [Self-hosting](self-hosting) — run your own Momo instance (and turn on `REQUIRE_2FA`)
