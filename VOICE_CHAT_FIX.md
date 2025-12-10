# Voice Chat Fix Guide

## Issue Summary

Voice chat (Speech-to-Text and Text-to-Speech) is not working because it requires a Google API key.

## Root Cause

Both STT and TTS services require:
- **Environment Variable**: `GEMINI_API_KEY` or `GOOGLE_API_KEY`

The services check for these keys:
```javascript
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
```

If no key is found, voice features fail with:
```
Error: Google API key not configured. Please add GEMINI_API_KEY or GOOGLE_API_KEY to your secrets.
```

## Solution: Add Google API Key

You have a Google Search API key, but voice features may need a different API configuration.

### Option 1: Try with Existing Key First

Your existing key might work if the required APIs are enabled:
```bash
GEMINI_API_KEY=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls
```

### Option 2: Get a Dedicated Gemini API Key

For best results, get a dedicated Gemini API key:

1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Select your Google Cloud project (or create one)
4. Copy the generated key (starts with `AIza`)

## Setup Instructions

### For Replit:
1. Go to Secrets (🔒 icon)
2. Add secret:
   - Key: `GEMINI_API_KEY`
   - Value: Your API key
3. Restart the backend

### For AWS/VPS:
1. Edit `.env` file:
   ```bash
   cd /path/to/myaiagent-mvp/backend
   nano .env
   ```
2. Add:
   ```bash
   GEMINI_API_KEY=YOUR_API_KEY_HERE
   ```
3. Restart:
   ```bash
   pm2 restart myaiagent-backend
   ```

### For Database Storage:
Use Admin Dashboard:
1. Login → Admin Dashboard → API Keys
2. Add new secret:
   - Service: `Google`
   - Key Name: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
   - Value: Your API key
   - Mark as Active

## Required Google APIs

Ensure these are enabled in Google Cloud Console:

1. **Cloud Speech-to-Text API**
   - Go to: https://console.cloud.google.com/apis/library/speech.googleapis.com
   - Click "Enable"

2. **Cloud Text-to-Speech API**
   - Go to: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
   - Click "Enable"

3. **Generative Language API** (for Gemini)
   - Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   - Click "Enable"

## Testing Voice Features

### Test Speech-to-Text:
1. Open the chat interface
2. Click the microphone icon
3. Allow microphone permissions
4. Speak clearly
5. Check if your speech is transcribed

### Test Text-to-Speech:
1. Send a message in chat
2. Look for a speaker icon or audio playback option
3. Click to hear the AI response

## Troubleshooting

### Error: "Google API key not configured"
- ✅ Check environment variable is set
- ✅ Restart backend after adding key
- ✅ Verify key starts with `AIza`

### Error: "Failed to transcribe audio"
- ✅ Enable Speech-to-Text API in Google Cloud
- ✅ Check API quota limits
- ✅ Verify microphone permissions in browser
- ✅ Check audio format (should be WEBM_OPUS)

### Error: "Failed to generate speech"
- ✅ Enable Text-to-Speech API in Google Cloud
- ✅ Check API quota limits
- ✅ Verify voice ID is valid (default: `en-US-Wavenet-F`)

### Microphone not working:
- ✅ Check browser permissions (chrome://settings/content/microphone)
- ✅ Ensure HTTPS connection (required for microphone access)
- ✅ Try a different browser
- ✅ Check system microphone settings

### Audio not playing:
- ✅ Check browser audio permissions
- ✅ Verify speakers/headphones are connected
- ✅ Check volume levels
- ✅ Look for browser console errors (F12)

## API Pricing

### Speech-to-Text:
- First 60 minutes/month: **FREE**
- After: $0.006 per 15 seconds ($1.44/hour)

### Text-to-Speech:
- First 1 million characters/month: **FREE** (Standard voices)
- Standard voices: $4 per 1 million characters
- WaveNet voices: $16 per 1 million characters

### Gemini API:
- Free tier: 60 requests per minute
- Paid tiers available

Monitor usage at: https://console.cloud.google.com/billing

## How Voice Chat Works

### Speech-to-Text Flow:
```
User speaks → Browser captures audio
  ↓
Audio sent to /api/stt/transcribe
  ↓
Backend forwards to Google Speech API
  ↓
Google returns transcript
  ↓
Transcript appears in chat
```

### Text-to-Speech Flow:
```
AI generates response
  ↓
Backend calls /api/tts/generate
  ↓
Google TTS API synthesizes speech
  ↓
Returns MP3 audio data
  ↓
Browser plays audio
```

## Quick Fix Script

Create a file `fix-voice.sh`:

```bash
#!/bin/bash

# Add to your environment
echo "Adding GEMINI_API_KEY..."

# For Replit (add to secrets)
# For VPS, add to .env:
cd /path/to/myaiagent-mvp/backend

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Add or update the key
grep -q "GEMINI_API_KEY" .env && \
  sed -i 's/GEMINI_API_KEY=.*/GEMINI_API_KEY=YOUR_KEY_HERE/' .env || \
  echo "GEMINI_API_KEY=YOUR_KEY_HERE" >> .env

echo "✅ Key added to .env"
echo "Now restart the backend"
```

## Current Key Status

Based on your information:
- **Google Search API Key**: ✅ Provided
- **Google Search Engine ID**: ✅ Provided
- **Gemini/Google API Key for Voice**: ❓ Needs verification

### If using same key for voice:

The key `AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls` might work for voice if:
1. Speech-to-Text API is enabled
2. Text-to-Speech API is enabled
3. Project has proper permissions

### To verify:
```bash
# Test Speech-to-Text API
curl -H "Content-Type: application/json" \
  -d '{
    "config": {"languageCode": "en-US"},
    "audio": {"content": ""}
  }' \
  "https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"

# Test Text-to-Speech API
curl -H "Content-Type: application/json" \
  -d '{
    "input": {"text": "Hello"},
    "voice": {"languageCode": "en-US"},
    "audioConfig": {"audioEncoding": "MP3"}
  }' \
  "https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyAdKV4Zcff4B1AZunCR0QVmdjfAtlXA9Ls"
```

If these work, use the same key for voice!

## Summary

To fix voice chat:
1. ✅ Add `GEMINI_API_KEY` to environment (can try existing Google Search key)
2. ✅ Enable Speech-to-Text and Text-to-Speech APIs in Google Cloud
3. ✅ Restart backend
4. ✅ Test microphone and audio in browser
5. ✅ Monitor API usage and quotas

For fastest results, try using your existing Google API key first and enable the required APIs.
