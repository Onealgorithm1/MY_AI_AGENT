# Visual Guide: Getting Your Google Cloud JSON Key

## The Problem

You're looking at this form and wondering: **"What exactly do I paste in the API Key Value field?"**

```
API Key Value *
└─> [What goes here???]
```

## The Answer

You paste the **ENTIRE JSON file content** that Google Cloud gives you. Let me show you exactly how.

---

## Step 1: Get the JSON File from Google Cloud

### A. Go to Google Cloud Console

1. Open: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Sign in with your Google account

### B. Enable Speech-to-Text API First

Before creating a service account, enable the API:

1. Go to: https://console.cloud.google.com/apis/library
2. Search: **"Speech-to-Text"**
3. Click on **"Cloud Speech-to-Text API"**
4. Click the blue **"ENABLE"** button
5. Wait for it to enable (takes ~10-30 seconds)

### C. Create Service Account

1. Go back to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click the blue **"+ CREATE SERVICE ACCOUNT"** button at the top
3. Fill in the form:

```
Service account name: myaiagent-stt
Service account ID: myaiagent-stt (auto-fills)
Description: Service account for MyAIAgent Speech-to-Text
```

4. Click **"CREATE AND CONTINUE"**

### D. Add the Permission

1. Under "Grant this service account access to project":
2. Click the **"Select a role"** dropdown
3. Type: **"speech"**
4. Select: **"Cloud Speech-to-Text" → "Cloud Speech Client"**
5. Click **"CONTINUE"**
6. Click **"DONE"** (skip step 3)

### E. Create the JSON Key

1. You'll see your service account in the list
2. Click on the **email address** (e.g., `myaiagent-stt@your-project.iam.gserviceaccount.com`)
3. Click the **"KEYS"** tab at the top
4. Click **"ADD KEY"** → **"Create new key"**
5. Select **"JSON"** (should be selected by default)
6. Click **"CREATE"**

### F. File Downloads!

A JSON file will automatically download to your computer:
- Filename: `your-project-name-abc123.json`
- Location: Usually your Downloads folder
- Size: ~2-3 KB

**IMPORTANT**: This file contains your private key. Keep it secure!

---

## Step 2: Open the Downloaded File

### On Windows:
1. Open **File Explorer**
2. Go to **Downloads** folder
3. Right-click the `.json` file
4. Select **"Open with" → "Notepad"** (or VS Code, Sublime, etc.)

### On Mac:
1. Open **Finder**
2. Go to **Downloads** folder
3. Right-click the `.json` file
4. Select **"Open With" → "TextEdit"** (or VS Code, Sublime, etc.)

### On Linux:
```bash
cd ~/Downloads
cat your-project-name-*.json
# or
nano your-project-name-*.json
```

---

## Step 3: Copy the ENTIRE File Content

When you open the file, you'll see something like this:

```json
{
  "type": "service_account",
  "project_id": "myaiagent-prod-123456",
  "private_key_id": "abc123def456789",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXyZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890\n-----END PRIVATE KEY-----\n",
  "client_email": "myaiagent-stt@myaiagent-prod-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/myaiagent-stt%40myaiagent-prod-123456.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

### SELECT ALL THE TEXT:
- **Windows**: Press `Ctrl + A`
- **Mac**: Press `Cmd + A`
- **Or**: Click and drag to select from the first `{` to the last `}`

### COPY IT:
- **Windows**: Press `Ctrl + C`
- **Mac**: Press `Cmd + C`
- **Or**: Right-click → Copy

**⚠️ IMPORTANT**: Make sure you copy:
- ✅ The opening `{`
- ✅ ALL the content
- ✅ The closing `}`
- ❌ NO extra spaces before or after

---

## Step 4: Fill Out the Form

Now go to your admin panel form and fill it out:

### Fill These Fields:

```
┌─────────────────────────────────────────────────────────────────┐
│ Create Custom API Category                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Category Name *                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Google Cloud                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Description (optional)                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Speech-to-Text Production                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ API Keys (1)                                         [+ Add Another Key] │
│                                                                  │
│ Key #1                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Key Name (e.g., STRIPE_API_KEY) *                            │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ GOOGLE_APPLICATION_CREDENTIALS_JSON                      │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ Key Label (e.g., Production Key) *                           │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Production STT Service Account                           │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ API Key Value *                                              │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ PASTE THE ENTIRE JSON HERE                               │ │ │
│ │ │ (Ctrl+V / Cmd+V)                                         │ │ │
│ │ │                                                           │ │ │
│ │ │ The whole thing - all lines from { to }                  │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ Get API Key URL (e.g., https://dashboard.stripe.com/apikeys) *│ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ https://console.cloud.google.com/iam-admin/serviceaccounts│ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                    [Create Category with 1 Key]  [Cancel]       │
└─────────────────────────────────────────────────────────────────┘
```

### Exact Values to Type:

| Field | What to Type/Paste |
|-------|-------------------|
| **Category Name** | `Google Cloud` |
| **Description** | `Speech-to-Text Production` (or leave blank) |
| **Key Name** | `GOOGLE_APPLICATION_CREDENTIALS_JSON` |
| **Key Label** | `Production STT Service Account` |
| **API Key Value** | **PASTE THE ENTIRE JSON** (Ctrl+V / Cmd+V) |
| **Get API Key URL** | `https://console.cloud.google.com/iam-admin/serviceaccounts` |

---

## Step 5: What the API Key Value Should Look Like After Pasting

After you paste, the "API Key Value" field should contain:

```
{
  "type": "service_account",
  "project_id": "myaiagent-prod-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "myaiagent-stt@...",
  ...all the other fields...
}
```

**It should look like a big block of JSON text.**

### ✅ Good Examples:

```json
{"type":"service_account","project_id":"your-project",...}
```
(Can be minified - all on one line)

OR

```json
{
  "type": "service_account",
  "project_id": "your-project",
  ...
}
```
(Can be formatted - multiple lines)

### ❌ Bad Examples:

```
'{"type":"service_account",...}'
```
❌ Has extra quotes around it

```
/path/to/file.json
```
❌ Just a file path (wrong!)

```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```
❌ Just the private key (wrong! need the whole JSON)

```
service_account
```
❌ Just one field (wrong! need the whole JSON object)

---

## Step 6: Submit the Form

1. Double-check all fields are filled
2. Make sure the JSON looks complete (starts with `{`, ends with `}`)
3. Click **"Create Category with 1 Key"**
4. Wait for success message: **"✅ Custom category created with 1 key"**

---

## Step 7: Test It

1. After creation, you'll see your new category listed
2. Find your key in the list
3. Click the **"Test"** button
4. Should see: **"✅ Key is valid and working"**

If test fails:
- Check that you pasted the ENTIRE JSON
- Verify Speech-to-Text API is enabled in Google Cloud
- Make sure the service account has "Cloud Speech Client" role

---

## Still Confused? Here's a Super Simple Checklist

- [ ] Go to https://console.cloud.google.com/iam-admin/serviceaccounts
- [ ] Click "+ CREATE SERVICE ACCOUNT"
- [ ] Name it: `myaiagent-stt`
- [ ] Role: "Cloud Speech Client"
- [ ] Click the service account email
- [ ] Click "KEYS" tab → "ADD KEY" → "Create new key" → "JSON"
- [ ] File downloads (e.g., `your-project-abc123.json`)
- [ ] Open the file in Notepad/TextEdit
- [ ] Press Ctrl+A (or Cmd+A) to select ALL
- [ ] Press Ctrl+C (or Cmd+C) to copy
- [ ] Go to your admin panel form
- [ ] Click in "API Key Value" field
- [ ] Press Ctrl+V (or Cmd+V) to paste
- [ ] Fill in the other fields as shown above
- [ ] Click "Create Category with 1 Key"
- [ ] ✅ Done!

---

## What If I Already Have a Service Account?

If you already created a service account before:

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Find your existing service account in the list
3. Click on the email address
4. Go to "KEYS" tab
5. Click "ADD KEY" → "Create new key" → "JSON"
6. Download and paste as above

---

## What If I Lost My JSON File?

You can't re-download the same key, but you can create a new one:

1. Go to your service account in Google Cloud Console
2. Go to "KEYS" tab
3. Create a new JSON key (steps above)
4. You can delete the old key if you want (click ⋮ menu → Delete)

---

## Security Note

**⚠️ IMPORTANT**: The JSON file you download contains a private key.

- ✅ DO paste it into your admin panel (it gets encrypted)
- ✅ DO keep the file somewhere safe (like a password manager)
- ❌ DON'T commit it to git
- ❌ DON'T share it publicly
- ❌ DON'T email it

After you've pasted it into your admin panel, you can:
- Delete the downloaded file from your computer
- Or move it to a secure location (password manager, encrypted drive)

---

## Quick Troubleshooting

### "Invalid JSON format"
→ Make sure you copied the ENTIRE file contents, including `{` and `}`

### "Missing required fields"
→ The JSON must have: type, project_id, private_key, client_email

### "API not enabled"
→ Go enable Speech-to-Text API: https://console.cloud.google.com/apis/library

### "Permission denied"
→ Make sure service account has "Cloud Speech Client" role

### "Can't find the downloaded file"
→ Check your Downloads folder, or download it again from Google Cloud Console

---

## Summary

**What to paste**: The ENTIRE contents of the JSON file Google Cloud gives you

**Where it comes from**: Google Cloud Console → Service Accounts → Create Key → JSON

**What it looks like**: A JSON object with `type`, `project_id`, `private_key`, etc.

**How to paste**: Select all (Ctrl+A), copy (Ctrl+C), paste (Ctrl+V) into "API Key Value" field

That's it! 🎉
