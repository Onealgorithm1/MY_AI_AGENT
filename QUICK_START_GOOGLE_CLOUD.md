# Quick Start: Google Cloud API Key Setup

## You're Looking at This Form

You need to know: **What do I paste in the "API Key Value" field?**

## The Answer

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Download JSON from Google Cloud                           │
│    https://console.cloud.google.com/iam-admin/serviceaccounts│
│                                                               │
│    Downloaded file: "your-project-abc123.json"               │
│                                                               │
│    ↓                                                          │
│                                                               │
│ 2. Open file in Notepad/TextEdit                             │
│                                                               │
│    You'll see:                                                │
│    {                                                          │
│      "type": "service_account",                               │
│      "project_id": "...",                                     │
│      "private_key": "-----BEGIN PRIVATE KEY-----\n...",       │
│      ...                                                      │
│    }                                                          │
│                                                               │
│    ↓                                                          │
│                                                               │
│ 3. Select ALL (Ctrl+A), Copy (Ctrl+C)                        │
│                                                               │
│    ↓                                                          │
│                                                               │
│ 4. Paste (Ctrl+V) into "API Key Value" field in form         │
│                                                               │
│    ✅ DONE!                                                   │
└──────────────────────────────────────────────────────────────┘
```

## Fill Out the Form Like This

```
Category Name:
  Google Cloud

Description:
  Speech-to-Text Production

Key #1:
  Key Name:
    GOOGLE_APPLICATION_CREDENTIALS_JSON

  Key Label:
    Production STT Service Account

  API Key Value:
    [PASTE THE ENTIRE JSON FILE CONTENTS HERE]
    (Everything from { to } including all lines)

  Get API Key URL:
    https://console.cloud.google.com/iam-admin/serviceaccounts
```

## What to Paste (Example)

When you open the downloaded JSON file, it looks like this:

```json
{
  "type": "service_account",
  "project_id": "myaiagent-prod-123456",
  "private_key_id": "abc123def456",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIB...(very long)...xyz\n-----END PRIVATE KEY-----\n",
  "client_email": "myaiagent-stt@myaiagent-prod-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}
```

**Copy ALL of that** (every line from the first `{` to the last `}`) and paste it into the "API Key Value" field.

## Don't Have a JSON File Yet?

### Get it from Google Cloud Console:

1. **Go to**: https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Click**: "+ CREATE SERVICE ACCOUNT"

3. **Fill in**:
   - Name: `myaiagent-stt`
   - Role: "Cloud Speech Client"

4. **Create Key**:
   - Click the service account
   - Keys tab → ADD KEY → Create new key → JSON
   - File downloads

5. **Open the file** in Notepad/TextEdit

6. **Copy everything** (Ctrl+A, then Ctrl+C)

7. **Paste into form** (Ctrl+V)

## Still Confused?

Read the detailed guide: `docs/setup/GOOGLE_CLOUD_VISUAL_GUIDE.md`

Or just remember:
- **What to paste**: The ENTIRE contents of the JSON file
- **Where it is**: The file Google Cloud downloads (usually in Downloads folder)
- **How to paste**: Open file → Select All → Copy → Paste into form

That's it! 🚀
