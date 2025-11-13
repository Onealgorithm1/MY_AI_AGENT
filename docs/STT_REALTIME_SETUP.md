# Real-Time Speech-to-Text (STT) Setup Guide

## Current Status

**Good News:** Your application already has FULL real-time WebSocket STT support implemented! 🎉

**The Issue:** Google Cloud STT credentials are NOT configured, so the system falls back to the old record-then-transcribe approach.

## What's Already Implemented

### Backend ✅
- **WebSocket Server**: `/stt-stream` endpoint (`myaiagent-mvp/backend/src/websocket/sttStream.js`)
- **Streaming Service**: Full Google Cloud STT streaming implementation (`myaiagent-mvp/backend/src/services/sttStreamingService.js`)
- **Features**:
  - Real-time partial transcripts
  - Final transcripts with confidence scores
  - Optimized for speech (16kHz sample rate)
  - Automatic punctuation
  - Voice activity detection
  - Performance monitoring

### Frontend ✅
- **Enhanced STT Hook**: `myaiagent-mvp/frontend/src/hooks/useEnhancedSTT.js`
- **Features**:
  - WebSocket streaming with automatic fallback to REST
  - Voice Activity Detection (VAD)
  - Auto-stop on silence (1.5 seconds)
  - Real-time partial transcripts displayed to user
  - Optimized audio settings

### Integration ✅
- ChatPage already uses the enhanced hook (line 112 in `ChatPage.jsx`)
- VoiceInputIndicator component shows real-time transcripts (line 1107-1115)
- System defaults to enhanced mode unless explicitly disabled

## Why It's Not Working

The frontend is trying to use WebSocket streaming, but the backend fails to initialize because:

**Missing Google Cloud STT API Credentials**

When the backend tries to connect to Google Cloud STT without credentials:
1. The WebSocket connection fails during initialization (sttStreamingService.js:97-117)
2. Frontend receives an error or timeout
3. System automatically falls back to the old HTTP POST approach
4. You see "Google Cloud STT credentials required" message

## How to Enable Real-Time STT

### Option 1: Add Google Cloud Credentials to Database (Recommended)

**📖 For detailed step-by-step instructions with screenshots and troubleshooting, see:**
- **[Complete Setup Guide](setup/GOOGLE_CLOUD_API_SETUP.md)** - Full walkthrough from Google Cloud Console to testing
- **[Quick Form Reference](setup/GOOGLE_CLOUD_FORM_QUICK_REF.md)** - Quick guide for filling out the admin panel form

**Quick Summary**:

1. **Get Google Cloud Service Account Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Speech-to-Text API
   - Create a service account with "Cloud Speech Client" role
   - Download the JSON key file
   - **[Detailed instructions →](setup/GOOGLE_CLOUD_API_SETUP.md#part-1-setting-up-google-cloud-service-account-for-stt)**

2. **Add to Database via Admin Panel**:
   - Access the admin panel at https://werkules.com/admin
   - Scroll to "API Keys" section
   - Click "+ Create Custom Category" or find "Google Cloud" category
   - Fill in the form:
     - **Key Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
     - **Key Label**: `Production STT Service Account`
     - **Key Value**: [Paste entire JSON content from downloaded file]
   - Click "Create Category" or "Save Key"
   - **[Form filling guide →](setup/GOOGLE_CLOUD_FORM_QUICK_REF.md)**

3. **Restart Backend**:
   ```bash
   # SSH into your server
   ssh -i ~/Downloads/myaiagent-key.pem ubuntu@3.144.201.118

   cd ~/MY_AI_AGENT
   ./switch-to-new-backend.sh
   ```

### Option 2: Add to Environment Variable

1. **Edit backend .env file**:
   ```bash
   cd ~/MY_AI_AGENT/myaiagent-mvp/backend
   nano .env
   ```

2. **Add one of these options**:

   **Option A** - JSON string (recommended):
   ```env
   GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
   ```

   **Option B** - File path:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/google-cloud-key.json
   ```

3. **Restart backend**:
   ```bash
   cd ~/MY_AI_AGENT
   ./switch-to-new-backend.sh
   ```

### Option 3: Test Without Real-Time (Current State)

The application works fine without Google Cloud credentials:
- Uses browser's built-in Speech Recognition API
- Record → Transcribe approach (not real-time)
- No additional costs
- No setup required

## Verification Steps

After adding credentials, test the real-time STT:

1. **Check Backend Logs**:
   ```bash
   tail -f ~/MY_AI_AGENT/myaiagent-mvp/backend/backend.log
   ```

   You should see:
   ```
   ✅ Google Cloud STT client initialized
   ✅ STT WebSocket server initialized on /stt-stream
   ```

2. **Test in Browser**:
   - Open https://werkules.com
   - Open browser console (F12)
   - Click the microphone button
   - You should see:
     ```
     ✅ WebSocket STT connected
     🎤 STT service ready
     🎤 WebSocket streaming started
     📝 Partial: [real-time text as you speak]
     ✅ Final: [complete transcript]
     ```

3. **Check for Real-Time Behavior**:
   - As you speak, you should see text appear IMMEDIATELY
   - The VoiceInputIndicator should show partial transcripts in real-time
   - No delay between speaking and seeing text

## Troubleshooting

### Issue: WebSocket Connection Fails
**Solution**: Check that credentials are valid and Speech-to-Text API is enabled in Google Cloud Console.

### Issue: Still Seeing "Transcribing..." After Speaking
**Solution**: Frontend is falling back to REST. Check backend logs for credential errors.

### Issue: No Text Appearing
**Solution**:
1. Check browser console for WebSocket errors
2. Verify microphone permissions are granted
3. Check that backend is running on port 3000

### Issue: Partial Transcripts Not Showing
**Solution**:
1. Verify `VITE_ENABLE_ENHANCED_STT` is not set to 'false' in frontend .env
2. Check VoiceInputIndicator component is rendering
3. Verify isUsingWebSocket is true in browser console

## Cost Considerations

Google Cloud Speech-to-Text pricing:
- **First 60 minutes/month**: FREE
- **After free tier**: ~$0.024 per minute (streaming)

For low-volume personal use, you'll likely stay within the free tier.

## Current System Architecture

```
User speaks → Browser captures audio → WebSocket connection
                                              ↓
                                      Google Cloud STT
                                              ↓
                                      Partial results
                                              ↓
                                      Frontend displays real-time
                                              ↓
                                      Final transcript
```

**Without credentials (current state)**:
```
User speaks → Browser captures audio → Record full audio
                                              ↓
                                      HTTP POST when stopped
                                              ↓
                                      Browser's Speech API
                                              ↓
                                      Show "Transcribing..."
                                              ↓
                                      Final transcript
```

## Files Modified/Created

### Backend
- `myaiagent-mvp/backend/src/websocket/sttStream.js` - WebSocket endpoint
- `myaiagent-mvp/backend/src/services/sttStreamingService.js` - Google STT integration
- `myaiagent-mvp/backend/src/server.js` - Initialized WebSocket server (line 377)

### Frontend
- `myaiagent-mvp/frontend/src/hooks/useEnhancedSTT.js` - WebSocket streaming hook
- `myaiagent-mvp/frontend/src/pages/ChatPage.jsx` - Uses enhanced hook (line 112-129)

### Documentation
- `docs/STT_REALTIME_SETUP.md` - This guide

## Next Steps

1. **Immediate**: System works fine without credentials (using fallback)
2. **Optional**: Add Google Cloud credentials for real-time streaming
3. **Testing**: Use the verification steps above to confirm real-time mode

## Questions?

- **Do I need Google Cloud?** No, the system works fine without it using browser's built-in STT
- **What's the benefit of real-time?** Better UX - users see text as they speak vs waiting until they stop
- **Is it more accurate?** Google Cloud STT is generally more accurate than browser's built-in STT
- **How much does it cost?** First 60 minutes/month are free, then ~$0.024/minute

---

**Summary**: Everything is already implemented and working! You just need to add Google Cloud credentials if you want real-time streaming instead of record-then-transcribe.
