# Google Search API Setup Guide

## Quick Setup - Add Credentials

You've provided:
- **Google Search API Key**: `AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls`
- **Custom Search Engine ID**: `d4fcebd01520d41a0`

## Method 1: Environment Variables (Recommended)

Add these to your backend `.env` file or deployment environment:

```bash
# Google Custom Search API
GOOGLE_SEARCH_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls
GOOGLE_SEARCH_ENGINE_ID=d4fcebd01520d41a0
```

### For Replit Deployment:
1. Go to your Replit project
2. Click on "Secrets" (🔒 icon) in the left sidebar
3. Add these two secrets:
   - Key: `GOOGLE_SEARCH_API_KEY` → Value: `AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls`
   - Key: `GOOGLE_SEARCH_ENGINE_ID` → Value: `d4fcebd01520d41a0`
4. Restart your backend

### For AWS/VPS Deployment:
1. SSH into your server
2. Edit the `.env` file:
   ```bash
   cd /path/to/MY_AI_AGENT/myaiagent-mvp/backend
   nano .env
   ```
3. Add the lines above
4. Save and restart backend:
   ```bash
   pm2 restart myaiagent-backend
   ```

## Method 2: Database (Encrypted Storage)

If you're already running the application, use the Admin Dashboard:

1. Login to your application
2. Go to **Admin Dashboard** → **API Keys**
3. Add two new secrets:

   **Secret 1:**
   - Service Name: `Google`
   - Key Name: `GOOGLE_SEARCH_API_KEY`
   - Key Value: `AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls`
   - Mark as Default: ✅
   - Mark as Active: ✅

   **Secret 2:**
   - Service Name: `Google`
   - Key Name: `GOOGLE_SEARCH_ENGINE_ID`
   - Key Value: `d4fcebd01520d41a0`
   - Mark as Default: ✅
   - Mark as Active: ✅

4. Test by clicking the "Test" button
5. Restart backend if needed

## Method 3: Command Line Script

Run the provided script:

```bash
cd /home/user/MY_AI_AGENT
chmod +x add-google-search.sh
./add-google-search.sh
```

This script will:
1. Encrypt the credentials
2. Add them to the database
3. Verify the setup

## Testing Google Search

After adding the credentials, test in the chat:

```
Test queries:
- "what time is it in New York"
- "search for latest AI news"
- "find information about TypeScript"
```

The AI should now be able to perform web searches and return results.

## Troubleshooting

### Error: "Google Search Engine ID not configured"
- Check that `GOOGLE_SEARCH_ENGINE_ID` is set in environment or database
- Verify the value is exactly: `d4fcebd01520d41a0`
- Restart the backend after adding

### Error: "Google Search API key not configured"
- Check that `GOOGLE_SEARCH_API_KEY` is set in environment or database
- Verify the key starts with `AIza`
- Make sure key is marked as active in database

### Error: "API rate limit exceeded"
- Google Custom Search has 100 free queries per day
- After that, it's $5 per 1000 queries
- Monitor usage in Google Cloud Console

### Error: "Invalid API key"
- Verify the API key at: https://console.cloud.google.com/apis/credentials
- Make sure Custom Search API is enabled
- Try regenerating the API key if needed

## How It Works

The application checks for credentials in this order:

1. **Database** (`api_secrets` table):
   - Encrypted with AES-256-GCM
   - Stored securely with key name matching

2. **Environment Variables** (Fallback):
   - `GOOGLE_SEARCH_API_KEY` or `GEMINI_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`

When a user asks to search the web:
```
User: "what time is it in New York"
  ↓
AI detects search query
  ↓
Backend calls webSearch function
  ↓
Retrieves credentials from DB or env
  ↓
Calls Google Custom Search API
  ↓
Returns formatted results
  ↓
AI presents results to user
```

## API Limits

- **Free tier**: 100 queries/day
- **Paid tier**: $5 per 1000 additional queries
- Monitor at: https://console.cloud.google.com/apis/dashboard

## Next Steps

1. ✅ Add credentials (choose method above)
2. ✅ Restart backend
3. ✅ Test web search in chat
4. ✅ Monitor API usage

## Support

If you continue to see errors:
1. Check backend logs for detailed error messages
2. Verify API key is valid in Google Cloud Console
3. Ensure Custom Search API is enabled
4. Test the API key directly:
   ```bash
   curl "https://www.googleapis.com/customsearch/v1?key=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls&cx=d4fcebd01520d41a0&q=test"
   ```
