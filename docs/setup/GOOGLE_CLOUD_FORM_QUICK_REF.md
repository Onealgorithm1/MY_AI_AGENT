# Quick Reference: Filling Out the Google Cloud API Form

## The Form You're Looking At

This is the **Create Custom API Category** form for adding Google Cloud Speech-to-Text credentials.

## How to Fill It Out

### Section 1: Category Information

```
Category Name *
└─> Google Cloud

Description (optional)
└─> Speech-to-Text Production
```

**Why "Google Cloud"?**
- This matches the predefined service name in the system
- It will group all your Google Cloud keys together
- Makes it easy to find and manage later

### Section 2: API Key Details

```
Key #1

Key Name (e.g., STRIPE_API_KEY) *
└─> GOOGLE_APPLICATION_CREDENTIALS_JSON

Key Label (e.g., Production Key) *
└─> Production STT Service Account

API Key Value *
└─> [Paste your entire service account JSON here]

Get API Key URL (e.g., https://dashboard.stripe.com/apikeys) *
└─> https://console.cloud.google.com/iam-admin/serviceaccounts
```

## What to Paste in "API Key Value"

**PASTE THE ENTIRE JSON FILE CONTENT**, like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "myaiagent-stt@your-project.iam.gserviceaccount.com",
  "client_id": "123456789012345",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/myaiagent-stt%40your-project.iam.gserviceaccount.com"
}
```

**IMPORTANT**:
- ✅ Include the opening `{` and closing `}`
- ✅ Include ALL fields (don't truncate)
- ✅ Keep the `\n` characters in the private_key field
- ✅ Copy-paste directly from the downloaded JSON file
- ❌ Don't add extra line breaks
- ❌ Don't remove any commas
- ❌ Don't format/prettify it (use exactly as downloaded)

## Step-by-Step: Getting Your JSON

### Quick Steps

1. **Go to Google Cloud Console**
   → https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Create Service Account** (if you don't have one)
   - Click "+ CREATE SERVICE ACCOUNT"
   - Name: `myaiagent-stt-service`
   - Role: **Cloud Speech Client**
   - Click "Done"

3. **Create Key**
   - Click on your service account email
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Click "Create"
   - File downloads automatically

4. **Open the Downloaded File**
   - Find file: `your-project-abc123.json`
   - Open with text editor (Notepad, VS Code, etc.)
   - Select ALL text (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

5. **Paste into Form**
   - Go back to your admin panel
   - Click in the "API Key Value" field
   - Paste (Ctrl+V / Cmd+V)

6. **Submit**
   - Click "Create Category with 1 Key"
   - Wait for success message: "✅ Custom category created with 1 key"

## Adding Multiple Keys (Optional)

If you want to add multiple Google Cloud keys (e.g., dev + production):

1. Click **"+ Add Another Key"** in the form

2. Fill out Key #2:
   ```
   Key Name: GOOGLE_APPLICATION_CREDENTIALS_JSON
   Key Label: Development STT Service Account
   API Key Value: [Paste dev service account JSON]
   Get API Key URL: https://console.cloud.google.com/iam-admin/serviceaccounts
   ```

3. The button will change to "Create Category with 2 Keys"

## Common Mistakes to Avoid

❌ **Only pasting part of the JSON**
```json
{
  "type": "service_account",
  "project_id": "your-project",
  ...
```
✅ **Paste the COMPLETE JSON** (all ~15-20 lines)

---

❌ **Using the wrong Key Name**
```
Key Name: GOOGLE_CLOUD_API_KEY
```
✅ **Use the exact name**
```
Key Name: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

---

❌ **Pasting just the private key**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0...
-----END PRIVATE KEY-----
```
✅ **Paste the entire JSON object** (which includes the private key)

---

❌ **Adding extra quotes around the JSON**
```
'{"type":"service_account",...}'
```
✅ **Paste raw JSON** (no extra quotes)

## After Submitting the Form

### You Should See

1. **Success Message**:
   ```
   ✅ Custom category created with 1 key
   ```

2. **New Category Listed**:
   ```
   📦 Google Cloud
      Description: Speech-to-Text Production
      Keys: 1
      [Custom] badge
   ```

3. **Key Details** (click to expand):
   ```
   Label: Production STT Service Account
   Key: ...abc123 (last 7 chars)
   Status: 🟢 Active
   Default: ✅ Yes

   [Test] [Edit] [Delete] buttons
   ```

### Next: Test Your Key

1. Click the **"Test"** button
2. Wait for validation
3. Should see: **"✅ Key is valid and working"**

### Next: Restart Backend

For the credentials to take effect:

```bash
# SSH into your server
ssh -i ~/Downloads/myaiagent-key.pem ubuntu@3.144.201.118

# Switch to new backend (loads new credentials)
cd ~/MY_AI_AGENT
./switch-to-new-backend.sh

# Verify it loaded
tail -f ~/MY_AI_AGENT/myaiagent-mvp/backend/backend.log
```

Look for:
```
✅ Google Cloud STT client initialized
✅ STT WebSocket server initialized on /stt-stream
```

### Next: Test Real-Time STT

1. Go to https://werkules.com
2. Open browser console (F12)
3. Click microphone button
4. Start speaking
5. You should see text appear INSTANTLY as you speak! 🎤

## Troubleshooting the Form

### "Please fill out all required fields"

Check that you filled:
- ✅ Category Name
- ✅ Key Name (for each key)
- ✅ Key Label (for each key)
- ✅ API Key Value (for each key)
- ✅ Get API Key URL (for each key)

### "Invalid JSON format"

Your JSON might be malformed. Open the file in a JSON validator:
- https://jsonlint.com/
- Paste your JSON
- Fix any errors it shows
- Copy the corrected JSON
- Paste into form

### Form Won't Submit

1. Check browser console (F12) for errors
2. Make sure you're logged in as admin
3. Try refreshing the page
4. Clear browser cache and try again

### Can't Find the Form

1. Make sure you're at: `/admin` (e.g., `https://werkules.com/admin`)
2. Scroll down to "API Keys" section
3. Look for "+ Create Custom Category" button
4. If you don't see it, you might not have admin permissions

## Quick Copy-Paste Template

Use this template when filling out the form:

```
Category Name:
Google Cloud

Description:
Speech-to-Text Production

Key #1:
  Key Name: GOOGLE_APPLICATION_CREDENTIALS_JSON
  Key Label: Production STT Service Account
  API Key Value: [PASTE YOUR JSON HERE]
  Get API Key URL: https://console.cloud.google.com/iam-admin/serviceaccounts
```

## What Happens Behind the Scenes

When you submit this form:

1. ✅ Frontend validates all fields are filled
2. ✅ Backend receives the data
3. ✅ JSON is validated for correct structure
4. ✅ Key value is encrypted using AES-256-GCM
5. ✅ Encrypted data is stored in `api_secrets` table
6. ✅ First key is automatically set as default
7. ✅ Category appears in your admin panel
8. ✅ Backend can now use these credentials for STT

**Your actual key is NEVER stored in plain text!** Only the encrypted version is saved to the database.

## Related Documentation

For more detailed information, see:
- **Full Setup Guide**: `/docs/setup/GOOGLE_CLOUD_API_SETUP.md`
- **STT Real-Time Setup**: `/docs/STT_REALTIME_SETUP.md`
- **Secrets Management**: `/docs/setup/SECRETS_SETUP.md`

---

## Need Help?

If you're stuck at any step:
1. Check the full guide: `docs/setup/GOOGLE_CLOUD_API_SETUP.md`
2. Check backend logs for specific errors
3. Verify you enabled Speech-to-Text API in Google Cloud Console
4. Make sure your service account has "Cloud Speech Client" role

**You've got this!** 🚀
