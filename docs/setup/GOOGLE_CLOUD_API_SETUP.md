# Google Cloud API Configuration Guide

## Overview

This guide will help you configure Google Cloud credentials for Speech-to-Text and other Google Cloud services in your application.

## What You Need

Your application supports two types of Google Cloud credentials:

1. **Google Cloud Service Account** (For STT, Vertex AI, etc.)
   - Key Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Format: JSON service account key
   - Used for: Speech-to-Text, Vertex AI, Cloud APIs

2. **Google OAuth Client** (For user authentication)
   - Key Name: `GOOGLE_OAUTH_CLIENT_CREDENTIALS`
   - Format: OAuth 2.0 client credentials JSON
   - Used for: Gmail integration, user authentication

## Part 1: Setting Up Google Cloud Service Account (For STT)

### Step 1: Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top of the page
4. Click **"New Project"** or select an existing project
5. If creating new:
   - **Project Name**: `MyAIAgent-Production` (or your preferred name)
   - **Organization**: Leave as default or select your org
   - Click **"Create"**

### Step 2: Enable Speech-to-Text API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
   - Or visit: https://console.cloud.google.com/apis/library
2. Search for **"Speech-to-Text API"**
3. Click on **"Cloud Speech-to-Text API"**
4. Click **"Enable"**
5. Wait for the API to be enabled (usually 10-30 seconds)

### Step 3: Create a Service Account

1. Go to **IAM & Admin** → **Service Accounts**
   - Or visit: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **"+ Create Service Account"** at the top
3. Fill in the details:
   - **Service account name**: `myaiagent-stt-service`
   - **Service account ID**: Will auto-populate (e.g., `myaiagent-stt-service@your-project.iam.gserviceaccount.com`)
   - **Description**: `Service account for MyAIAgent Speech-to-Text`
4. Click **"Create and Continue"**

### Step 4: Grant Permissions

1. Under **"Grant this service account access to project"**:
   - Click the **"Select a role"** dropdown
   - Search for **"Speech-to-Text"**
   - Select **"Cloud Speech Client"** or **"Cloud Speech Administrator"**
   - Click **"+ Add Another Role"** if you need additional permissions:
     - For Vertex AI: Add **"Vertex AI User"**
     - For other Cloud APIs: Add relevant roles
2. Click **"Continue"**
3. Click **"Done"** (you can skip the optional step 3)

### Step 5: Create and Download the JSON Key

1. Find your newly created service account in the list
2. Click on the service account name (the email address)
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** as the key type
6. Click **"Create"**
7. The JSON key file will automatically download to your computer
   - **IMPORTANT**: Keep this file secure! It contains sensitive credentials
   - The file name will be something like: `your-project-abc123.json`

### Step 6: Prepare the JSON Content

1. Open the downloaded JSON file in a text editor
2. The content should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "myaiagent-stt-service@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

3. **Copy the entire JSON content** (all lines, including the outer braces)

## Part 2: Adding Credentials via Admin Panel

### Option A: Using Custom API Category (Recommended for Production)

This is the form you showed - perfect for organizing multiple Google Cloud keys.

1. **Access Admin Panel**:
   - Navigate to your admin panel: `https://werkules.com/admin` (or your domain)
   - Log in with your admin account

2. **Create Custom API Category**:
   - Scroll down to the **API Keys** section
   - Click **"+ Create Custom Category"**

3. **Fill in the Form**:
   ```
   Category Name: Google Cloud
   Description: Speech-to-Text Production
   ```

4. **Add the Service Account Key**:
   ```
   Key #1:
   - Key Name: GOOGLE_APPLICATION_CREDENTIALS_JSON
   - Key Label: Production STT Service Account
   - API Key Value: [Paste the entire JSON content from Step 6]
   - Get API Key URL: https://console.cloud.google.com/iam-admin/serviceaccounts
   ```

5. **Create the Category**:
   - Click **"Create Category with 1 Key"**
   - You should see a success message: "✅ Custom category created with 1 key"

### Option B: Using Predefined Google Cloud Category (Quick Setup)

1. **Access Admin Panel**:
   - Navigate to `https://werkules.com/admin`
   - Scroll to **API Keys** section

2. **Find Google Cloud Section**:
   - Look for the **"Google Cloud"** predefined category
   - Click **"+ Add Google Cloud Key"**

3. **Fill in the Key Details**:
   ```
   Key Label: Production STT Key
   Key Value: [Paste the entire JSON content]
   ```

4. **Save and Set as Default**:
   - Click **"Save Key"**
   - Click **"Set as Default"** to make it the primary key
   - Click **"Test"** to verify the credentials work

## Part 3: Verification and Testing

### Verify in Admin Panel

1. After saving, you should see your key listed:
   - **Service**: Google Cloud
   - **Label**: Production STT Service Account (or your label)
   - **Key**: `...abc123` (last 4-7 characters shown)
   - **Status**: 🟢 Active
   - **Default**: ✅ Yes

2. **Test the Key**:
   - Click the **"Test"** button next to your key
   - The system will validate the JSON format and structure
   - You should see: "✅ Key is valid and working"

### Verify in Backend Logs

1. **SSH into your server**:
   ```bash
   ssh -i ~/Downloads/myaiagent-key.pem ubuntu@3.144.201.118
   ```

2. **Restart the backend** to load new credentials:
   ```bash
   cd ~/MY_AI_AGENT
   ./switch-to-new-backend.sh
   ```

3. **Check the logs**:
   ```bash
   tail -f ~/MY_AI_AGENT/myaiagent-mvp/backend/backend.log
   ```

4. **Look for these success messages**:
   ```
   ✅ Google Cloud STT client initialized
   ✅ STT WebSocket server initialized on /stt-stream
   ```

### Test Real-Time STT in Browser

1. **Open your application**: `https://werkules.com`

2. **Open browser DevTools**:
   - Press `F12` or right-click → Inspect
   - Go to the **Console** tab

3. **Click the microphone button** in the chat interface

4. **Watch for these console messages**:
   ```
   ✅ WebSocket STT connected
   🎤 STT service ready
   🎤 WebSocket streaming started
   ```

5. **Start speaking**:
   - You should see **partial transcripts** appear in real-time
   - Text should appear IMMEDIATELY as you speak (not after you stop)
   - When you stop speaking, you'll see: `✅ Final: [your complete transcript]`

6. **Success indicators**:
   - ✅ Text appears while you're still speaking
   - ✅ VoiceInputIndicator shows real-time partial transcripts
   - ✅ No "Transcribing..." delay after you stop
   - ✅ Automatic stop after 1.5 seconds of silence

## Part 4: Google OAuth Setup (Optional - For Gmail Integration)

### Step 1: Create OAuth 2.0 Client

1. Go to **APIs & Services** → **Credentials**
   - Or visit: https://console.cloud.google.com/apis/credentials

2. Click **"+ Create Credentials"** → **"OAuth client ID"**

3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External (for public apps) or Internal (for workspace)
   - **App name**: MyAIAgent
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click **"Save and Continue"**

4. **Create OAuth Client**:
   - **Application type**: Web application
   - **Name**: MyAIAgent Web Client
   - **Authorized redirect URIs**: Add your callback URLs:
     - `https://werkules.com/auth/google/callback`
     - `http://localhost:3000/auth/google/callback` (for local dev)
   - Click **"Create"**

### Step 2: Download OAuth Credentials

1. After creation, you'll see a dialog with:
   - **Client ID**: `123456789-abc.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-...`

2. Click **"Download JSON"** to get the credentials file

3. The JSON will look like:
```json
{
  "web": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "project_id": "your-project",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-...",
    "redirect_uris": ["https://werkules.com/auth/google/callback"]
  }
}
```

### Step 3: Add OAuth Credentials to Admin Panel

1. **Go to Admin Panel** → **API Keys**

2. **Find "Google OAuth" category** or create custom category:
   ```
   Category Name: Google OAuth
   Description: OAuth 2.0 for Gmail Integration
   ```

3. **Add the credentials**:
   ```
   Key Name: GOOGLE_OAUTH_CLIENT_CREDENTIALS
   Key Label: Production OAuth Client
   API Key Value: [Paste the entire JSON content]
   Get API Key URL: https://console.cloud.google.com/apis/credentials
   ```

4. **Save and Test**

## Troubleshooting

### Issue: "Invalid JSON format"

**Solution**: Make sure you copied the ENTIRE JSON content, including:
- Opening `{`
- All fields and commas
- Closing `}`
- No extra characters or line breaks outside the JSON

### Issue: "Missing required fields"

**Solution**: Verify your JSON contains:
- For Service Account: `type`, `project_id`, `private_key`, `client_email`
- For OAuth: `client_id`, `client_secret` (in `web` or `installed` object)

### Issue: "API not enabled"

**Solution**:
1. Go to Google Cloud Console → APIs & Services → Library
2. Search for "Speech-to-Text API"
3. Click "Enable"
4. Wait 30 seconds and try again

### Issue: WebSocket connection fails

**Solution**:
1. Check backend logs for credential errors:
   ```bash
   tail -f ~/MY_AI_AGENT/myaiagent-mvp/backend/backend.log
   ```
2. Verify the service account has "Cloud Speech Client" role
3. Restart backend after adding credentials

### Issue: Still seeing "Transcribing..." delay

**Solution**: Frontend is falling back to browser's built-in STT
1. Open browser console (F12)
2. Look for WebSocket connection errors
3. Verify backend is running and credentials are loaded
4. Check that Speech-to-Text API is enabled in Google Cloud

## Cost Considerations

### Google Cloud Speech-to-Text Pricing

**Free Tier** (every month):
- First **60 minutes** of streaming recognition: FREE
- First **60 minutes** of standard recognition: FREE

**After Free Tier**:
- Streaming recognition: ~$0.024 per minute ($1.44 per hour)
- Standard recognition: ~$0.016 per minute ($0.96 per hour)

**For Personal/Low-Volume Use**:
- If you use less than 60 minutes per month → **FREE**
- Most personal projects stay within free tier
- Example: 10 conversations/day × 2 minutes each × 30 days = ~600 minutes/month = ~$13/month after free tier

**Cost Optimization Tips**:
1. Use Voice Activity Detection (VAD) to only send audio when speaking
2. Enable auto-stop on silence (already implemented - 1.5s timeout)
3. Monitor usage in Google Cloud Console
4. Set up billing alerts at your comfort level

## Security Best Practices

✅ **DO**:
- Store credentials in the encrypted database (admin panel)
- Use service accounts with minimal required permissions
- Rotate keys periodically (every 90 days)
- Set up billing alerts in Google Cloud Console
- Keep the JSON key file secure (never commit to git)
- Use different service accounts for dev/staging/production

❌ **DON'T**:
- Never commit service account JSON to git repositories
- Don't share service account keys publicly
- Don't use personal Google account credentials
- Don't give more permissions than needed
- Don't hardcode keys in application code

## Quick Reference

### Admin Panel URLs
- Production: `https://werkules.com/admin`
- Local: `http://localhost:5173/admin`

### Google Cloud Console URLs
- Project Dashboard: https://console.cloud.google.com/
- Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts
- API Library: https://console.cloud.google.com/apis/library
- OAuth Credentials: https://console.cloud.google.com/apis/credentials
- Billing: https://console.cloud.google.com/billing

### Key Names Reference
| Service | Key Name | Format |
|---------|----------|--------|
| Google Cloud STT | `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Service account JSON |
| Google OAuth | `GOOGLE_OAUTH_CLIENT_CREDENTIALS` | OAuth client JSON |
| Google APIs | `GOOGLE_API_KEY` | String (AIza...) |

## Next Steps

After successfully configuring Google Cloud credentials:

1. ✅ **Test Real-Time STT**: Click microphone and verify instant transcription
2. ✅ **Monitor Usage**: Check Google Cloud Console for API usage
3. ✅ **Set Billing Alerts**: Configure alerts before you exceed free tier
4. ✅ **Document Your Setup**: Note which project and service account you're using
5. ✅ **Plan Key Rotation**: Set reminder to rotate keys in 90 days

## Support

- **Google Cloud Documentation**: https://cloud.google.com/speech-to-text/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator
- **Support**: https://cloud.google.com/support

---

## Summary

You've successfully configured Google Cloud API credentials! Your application now has:
- ✅ Real-time Speech-to-Text streaming
- ✅ Instant partial transcripts as you speak
- ✅ Secure, encrypted credential storage
- ✅ Professional-grade STT accuracy
- ✅ Free tier for first 60 minutes/month

**Enjoy your enhanced voice experience!** 🎤✨
