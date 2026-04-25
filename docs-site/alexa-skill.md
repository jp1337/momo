---
layout: default
title: Alexa Skill
description: Control Momo by voice with Amazon Alexa — add tasks, check your daily quest, manage your wishlist. Full step-by-step setup guide.
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

> Momo supports German (`de-DE`) and English (`en-US`) — the skill responds in the language your Echo is set to.

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

## Prerequisites

- A regular **Amazon account**
- An **Amazon Echo device** or the Alexa app on your phone
- A running **Momo instance** with API Keys enabled
- A free **AWS account** for the Lambda function
- A free **Amazon Developer account** for the Alexa skill

**Time to set up: ~30 minutes.**

---

## Step-by-Step Setup

### Part 1 — AWS Lambda

#### 1.1 Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com) and click **Create a Free Account**
2. Sign in with your existing Amazon account or create a new one
3. Enter a credit card (required for verification — Lambda stays free within the Free Tier)
4. Complete phone verification
5. Choose the **Basic (Free)** plan
6. Wait for the activation email (~1–2 minutes)

> Lambda is permanently free within the AWS Free Tier: 1 million requests/month. A personal Alexa skill will never exceed this limit.

#### 1.2 Create the Lambda Function

1. Go to the [AWS Management Console](https://console.aws.amazon.com)
2. Search for **Lambda** in the top search bar
3. Make sure the region in the top right is set to **Europe (Frankfurt) eu-central-1** — or choose a region close to you
4. Click **Create function**
5. Select **Author from scratch**
6. Fill in:
   - **Function name**: `momo-alexa-skill`
   - **Runtime**: `Node.js 20.x`
   - **Architecture**: `x86_64`
7. Click **Create function**

#### 1.3 Upload the Skill Code

1. In your Lambda function, scroll to the **Code** section
2. Click **Upload from** → **.zip file**
3. Upload `alexa-skill/deploy.zip` from the Momo repository
   - If you don't have the file yet: run `npm run zip` inside the `alexa-skill/` directory
4. Click **Save**

Verify that the **Handler** is set to `index.handler` (under Runtime settings → Edit).

#### 1.4 Set the Environment Variable

1. Click **Configuration** → **Environment variables** in the left sidebar
2. Click **Edit** → **Add environment variable**
3. Enter:
   - **Key**: `MOMO_API_BASE_URL`
   - **Value**: `https://your-momo-instance.com` (your Momo URL)
4. Click **Save**

#### 1.5 Copy the Lambda ARN

In the top right of the Lambda console you'll see your function's **ARN**:
```
arn:aws:lambda:eu-central-1:123456789012:function:momo-alexa-skill
```
**Copy this ARN** — you'll need it in Part 3.

---

### Part 2 — Amazon Developer Account

1. Go to [developer.amazon.com](https://developer.amazon.com)
2. Click **Sign in** in the top right and log in with your Amazon account
3. Accept the terms of service (one-time)
4. The Developer Portal opens — no further details required

---

### Part 3 — Create the Alexa Skill

#### 3.1 Create a New Skill

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click **Create Skill**
3. Fill in:
   - **Skill name**: `Momo`
   - **Primary locale**: `English (US)` — or `German (DE)` if you prefer
4. Click **Next**
5. Choose model: **Other** → **Custom**
6. Click **Next**
7. Choose hosting: **Provision your own**
8. Click **Next** → **Start from Scratch** → **Create Skill**

#### 3.2 Import the Interaction Model

1. In the left sidebar, click **Interaction Model** → **JSON Editor**
2. Delete all existing content
3. Open `alexa-skill/models/en-US.json` (or `de-DE.json`) from the Momo repository
4. Paste the full contents into the JSON editor
5. Click **Save Model** → then **Build Model**
6. Wait for the build to complete (~1–2 minutes, green success message)

#### 3.3 Configure the Endpoint

1. In the left sidebar, click **Endpoint**
2. Select **AWS Lambda ARN**
3. Paste the Lambda ARN from Step 1.5 into the **Default Region** field:
   ```
   arn:aws:lambda:eu-central-1:123456789012:function:momo-alexa-skill
   ```
4. Click **Save Endpoints**
5. **Copy the Skill ID** shown at the top of the page — it starts with `amzn1.ask.skill.`

#### 3.4 Add the Alexa Trigger in Lambda

Back in the **AWS Lambda console**:

1. Click **+ Add trigger**
2. Select **Alexa Skills Kit**
3. Under **Skill ID verification**: choose **Enable** and enter your Skill ID
4. Click **Add**

---

### Part 4 — Account Linking

#### 4.1 Configure Account Linking in Alexa

In the **Alexa Developer Console** → your skill → left sidebar → **Account Linking**:

1. Enable the toggle **"Do you allow users to create an account or link to an existing account with you?"**
2. Set **Authorization Grant Type**: **Implicit Grant**
3. Fill in:
   - **Authorization URI**: `https://your-momo-instance.com/api/alexa/auth`
   - **Client ID**: `momo-alexa`
   - **Scope**: leave empty
   - **Domain List**: leave empty
4. Click **Save**

> **How it works for all users:**
> When a user taps "Link Account" in the Alexa app, Alexa opens your Momo instance's `/api/alexa/auth` endpoint. If the user isn't logged in, they're redirected to the Momo login page. After login, Momo automatically creates an API key named "Alexa" for that user and hands the token to Alexa. The key is visible under **Settings → API Keys** and can be revoked there at any time.

#### 4.2 Link Your Account in the Alexa App

1. Open the **Alexa app** on your phone
2. Go to **More** → **Skills & Games** → **Your Skills** → **Dev**
3. Tap **Momo**
4. Tap **Link Account** / **Enable to use**
5. A browser opens with your Momo instance
6. Log in — Momo creates the API key automatically
7. Alexa confirms "Account successfully linked"

---

### Part 5 — Test the Skill

#### In the browser (no Echo required)

1. In the Alexa Developer Console → **Test** (top menu)
2. Set **Skill testing is enabled in:** to **Development**
3. Type or say:
   - `open momo`
   - `add dentist appointment`
   - `what is my quest`
   - `list my tasks`

#### On an Echo device

Make sure your Echo and the Alexa app are connected to the same Amazon account, then say:  
**"Alexa, open Momo"**

---

## Supported Intents

| Intent | Example utterances |
|---|---|
| `AddTaskIntent` | "Add dentist", "New task groceries", "Note call mom" |
| `AddWishlistItemIntent` | "Add milk to the shopping list", "Put Nintendo Switch on my wishlist" |
| `GetQuestIntent` | "What is my quest?", "What's today's mission?", "What should I do today?" |
| `ListTasksIntent` | "List my tasks", "What do I have to do?", "My open tasks" |
| `AMAZON.HelpIntent` | "Help" |
| `AMAZON.StopIntent` | "Stop", "Cancel", "Quit" |

---

## Sharing the Skill with Others

By default, the skill is in **Development** mode — only accessible to the developer account. To let others use it:

- **Beta Testing** — Invite up to 500 users by Amazon account email in the Alexa Developer Console → Beta Testing. No certification required.
- **Public Skill Store** — Submit the skill for Amazon's certification process to publish it publicly.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "There was a problem with the requested skill's response" | Re-upload `deploy.zip` — the Lambda may have old code. Check CloudWatch Logs: Lambda → Monitor → View CloudWatch Logs |
| "Your account is not linked" | Open Alexa app → More → Skills → Dev Skills → Momo → Link Account |
| Lambda timeout | Set timeout to 10 seconds: Lambda → Configuration → General Configuration → Timeout |
| Skill not found on Echo device | Make sure the skill is enabled in the Alexa app and your Echo uses the same Amazon account |
| Build errors | Inside `alexa-skill/`: run `npm install && npm run zip` again |

---

## See also

- [Getting Started](/momo/getting-started)
- [API Keys](/momo/features#rest-api--api-keys)
- [Features](/momo/features)
