---
layout: default
title: Alexa Skill
description: Control Momo by voice with Amazon Alexa — add tasks, check your daily quest, manage your wishlist.
---

# Alexa Skill

Control Momo by voice using Amazon Alexa. Add tasks, check your Daily Quest, browse your task list, and fill your wishlist — hands-free.

---

## Voice Commands

| What you say | What happens |
|---|---|
| "Alexa, open Momo" | Start the skill |
| "Add dentist appointment" | Creates task "dentist appointment" |
| "Add milk to the shopping list" | Adds "milk" to your wishlist |
| "What is my quest?" | Reads your current Daily Quest aloud |
| "List my tasks" | Reads up to 5 open tasks |
| "Help" | Lists all available commands |
| "Stop" / "Cancel" | Closes the skill |

> Momo answers in German by default. The skill supports German (`de-DE`) and English (`en-US`).

---

## Prerequisites

- An **Amazon account** (a regular account with Prime works)
- An **Amazon Echo device** or the Alexa app on your phone
- A running Momo instance with **API Keys enabled** (available at `/api-keys`)
- An **AWS account** (free tier) for the Lambda function
- An **Amazon Developer account** (free) for the Alexa skill

---

## How Account Linking Works

Alexa needs to know which Momo account to use. This is handled via **Account Linking**:

1. You tap "Link Account" in the Alexa app
2. Momo's login page opens in your browser
3. You log in with your existing Momo account
4. Momo automatically creates an API key called **"Alexa"** for your account
5. Alexa stores the key — done

The key is visible under **Settings → API Keys** in Momo and can be revoked at any time to disconnect the skill.

---

## Setup

The skill runs as an AWS Lambda function that calls the Momo REST API. Full step-by-step setup instructions are in the repository:

📄 **[`alexa-skill/SETUP.md`](https://github.com/jp1337/momo/blob/main/alexa-skill/SETUP.md)**

The guide covers:
- Creating a free AWS account and Lambda function
- Uploading the pre-built skill code (`deploy.zip`)
- Creating the Alexa skill in the Amazon Developer Console
- Importing the interaction model
- Configuring Account Linking

**Time to set up:** ~30 minutes

---

## Architecture

```
You (voice)
    ↓
Amazon Echo / Alexa App
    ↓
Alexa Skills Kit → AWS Lambda (Node.js 20)
    ↓
POST/GET https://your-momo-instance/api/...
Authorization: Bearer <your-api-key>
```

The Lambda function is stateless — it receives the Alexa request, calls the Momo API, and returns the spoken response. No data is stored in Lambda.

---

## Supported Intents

| Intent | Example utterances |
|---|---|
| `AddTaskIntent` | "Add dentist", "New task groceries", "Note call mom" |
| `AddWishlistItemIntent` | "Add milk to the shopping list", "Put Nintendo Switch on the wishlist" |
| `GetQuestIntent` | "What is my quest?", "What's today's mission?", "What should I do today?" |
| `ListTasksIntent` | "List my tasks", "What do I have to do?", "My open tasks" |
| `AMAZON.HelpIntent` | "Help" |
| `AMAZON.StopIntent` | "Stop", "Cancel", "Quit" |

---

## Sharing the Skill with Others

By default, the skill is in **Development** mode and only accessible to the developer account. To let others use it:

- **Beta Testing** — Invite up to 500 users by Amazon account email in the Alexa Developer Console → Beta Testing. No certification required.
- **Public Skill Store** — Submit the skill for Amazon's certification process to publish it publicly.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "There was a problem with the requested skill's response" | Re-upload `deploy.zip` — the Lambda may have old code. Check CloudWatch Logs under Lambda → Monitor. |
| "Your account is not linked" | Open Alexa app → More → Skills → Dev Skills → Momo → Link Account |
| Lambda timeout | Set timeout to 10 seconds: Lambda → Configuration → General Configuration |
| Skill not found on Echo device | Make sure the skill is enabled in the Alexa app and your Echo uses the same Amazon account |
