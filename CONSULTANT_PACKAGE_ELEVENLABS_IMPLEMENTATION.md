# Consultant Package: ElevenLabs TTS Implementation & System Readiness
**Date:** November 3, 2025  
**Project:** My AI Agent - Full-Stack Chat Application  
**Status:** Staging Ready (6/10 Production Score)  
**Primary Objective:** Implement ElevenLabs TTS + Production Hardening

---

## Executive Summary

The AI chat application has completed **critical security hardening** (CSRF protection, HTTP-only cookies, OAuth fixes) and is **staging-ready for beta testing**. However, **production deployment is blocked** by missing automated testing, observability infrastructure, and several UX polish items. This package provides a complete implementation guide for ElevenLabs Text-to-Speech integration plus a prioritized roadmap for production readiness.

**Quick Stats:**
- ✅ **Security:** 7.5/10 (CSRF + JWT cookies working)
- ⚠️ **Features:** 75% complete (TTS not integrated, Google services 40% done)
- ❌ **Testing:** 0% automated coverage
- ❌ **Observability:** No monitoring or alerting
- ⚠️ **UX:** Multiple friction points on mobile

**Investment Required:**
- **P0 (Critical):** 60-80 hours over 2 weeks
- **P1 (High):** 80-100 hours over 1 month
- **Total to Production:** 140-180 hours (~4-5 weeks)

---

## Part 1: ElevenLabs TTS - Complete Implementation Guide

### Quick Start Checklist

**Pre-Implementation (5 minutes):**
- [ ] Verify `ELEVENLABS_API_KEY` environment secret exists
- [ ] Admin can access API Secrets dashboard
- [ ] Test: `curl -H "Authorization: Bearer $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices`
- [ ] Confirm `backend/src/services/elevenlabs.js` file exists

**Phase 1: Backend API (2-3 hours):**
- [ ] Create `backend/src/routes/tts.js` (voice list + synthesis)
- [ ] Register TTS routes in `server.js`
- [ ] Update CSP to allow `api.elevenlabs.io`
- [ ] Test endpoints with curl/Postman

**Phase 2: Frontend UI (2-3 hours):**
- [ ] Create `frontend/src/components/VoiceSelector.jsx`
- [ ] Add TTS toggle button to ChatPage
- [ ] Implement audio playback on message completion
- [ ] Add loading states during synthesis

**Phase 3: Persistence (1-2 hours):**
- [ ] Add `tts_enabled` + `tts_voice_id` columns to DB
- [ ] Update preferences API to save TTS settings
- [ ] Load TTS preferences on ChatPage mount
- [ ] Test preference persistence across sessions

**Phase 4: Testing (1 hour):**
- [ ] Test TTS with different voices
- [ ] Test on mobile Safari (audio playback)
- [ ] Test error handling (invalid API key)
- [ ] Test rate limiting behavior

**Total Time Estimate:** 6-9 hours

---

### Step-by-Step Implementation

#### Step 1: Backend TTS Routes (90 minutes)

**File:** `backend/src/routes/tts.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/auth');
const { textToSpeech, getVoices } = require('../services/elevenlabs');
const { getApiKey } = require('../services/apiSecrets');

/**
 * GET /api/tts/voices
 * Returns list of available ElevenLabs voices
 */
router.get('/voices', requireAuth, async (req, res) => {
  try {
    const apiKey = await getApiKey('elevenlabs');
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'ElevenLabs API key not configured. Please add it in the Admin Dashboard.',
        code: 'API_KEY_MISSING'
      });
    }

    const voices = await getVoices(apiKey);
    
    res.json({ 
      voices: voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels,
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching voices:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid ElevenLabs API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      code: 'FETCH_VOICES_FAILED'
    });
  }
});

/**
 * POST /api/tts/synthesize
 * Converts text to speech audio (MP3)
 * Body: { text: string, voiceId?: string }
 */
router.post('/synthesize', requireAuth, async (req, res) => {
  try {
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string',
        code: 'INVALID_TEXT'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: 'Text exceeds maximum length of 5000 characters',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Get API key
    const apiKey = await getApiKey('elevenlabs');
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'ElevenLabs API key not configured',
        code: 'API_KEY_MISSING'
      });
    }

    // Generate speech
    console.log(`🔊 Synthesizing speech: ${text.substring(0, 50)}... (voice: ${voiceId})`);
    const audioBuffer = await textToSpeech(text, voiceId, apiKey);
    
    // Return audio as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'X-Audio-Duration': Math.ceil(text.length / 15), // Rough estimate: 15 chars/sec
    });
    
    res.send(audioBuffer);
    console.log(`✅ Synthesized ${audioBuffer.length} bytes of audio`);
    
  } catch (error) {
    console.error('❌ Error synthesizing speech:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid ElevenLabs API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'ElevenLabs rate limit reached. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to synthesize speech',
      code: 'SYNTHESIS_FAILED'
    });
  }
});

module.exports = router;
```

**File:** `backend/src/server.js` (MODIFY)

```javascript
// Add to imports
const ttsRoutes = require('./routes/tts');

// Add to routes (after other API routes)
app.use('/api/tts', ttsRoutes);

// Update CSP configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://generativelanguage.googleapis.com",
          "https://api.elevenlabs.io",           // ← ADD THIS
          "https://api.elevenlabs.com",          // ← ADD THIS (fallback)
          "wss://*.replit.dev",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
```

**Testing Backend:**

```bash
# 1. Test voice list
curl -X GET http://localhost:3000/api/tts/voices \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -v

# Expected: JSON array of voices

# 2. Test synthesis
curl -X POST http://localhost:3000/api/tts/synthesize \
  -H "Cookie: jwt=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"text": "Hello, this is a test.", "voiceId": "EXAVITQu4vr4xnSDxMaL"}' \
  --output test-audio.mp3

# Expected: MP3 file downloads

# 3. Play audio to verify
# macOS: afplay test-audio.mp3
# Linux: mpg123 test-audio.mp3
```

---

#### Step 2: Frontend Voice Selector Component (60 minutes)

**File:** `frontend/src/components/VoiceSelector.jsx` (NEW)

```jsx
import { useState, useEffect } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

/**
 * Voice selector dropdown for ElevenLabs TTS
 * Fetches available voices and allows user to select preferred voice
 */
export default function VoiceSelector({ selectedVoice, onVoiceChange, className = '' }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/tts/voices');
      const voiceList = response.data.voices || [];
      
      setVoices(voiceList);
      
      // If no voice selected, default to first voice
      if (!selectedVoice && voiceList.length > 0) {
        onVoiceChange(voiceList[0].voice_id);
      }
      
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      
      if (error.response?.data?.code === 'API_KEY_MISSING') {
        setError('API key not configured');
        toast.error('ElevenLabs API key missing. Please add it in Admin Dashboard.');
      } else if (error.response?.data?.code === 'INVALID_API_KEY') {
        setError('Invalid API key');
        toast.error('Invalid ElevenLabs API key');
      } else {
        setError('Failed to load voices');
        toast.error('Could not load voice options');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading voices...</span>
      </div>
    );
  }

  if (error || voices.length === 0) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        {error || 'No voices available'}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Volume2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {voices.map((voice) => (
          <option key={voice.voice_id} value={voice.voice_id}>
            {voice.name}
            {voice.labels?.accent && ` (${voice.labels.accent})`}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

#### Step 3: ChatPage TTS Integration (90 minutes)

**File:** `frontend/src/services/api.js` (ADD)

```javascript
// Add TTS API methods to existing exports
export const tts = {
  getVoices: () => api.get('/tts/voices'),
  
  synthesize: async (text, voiceId) => {
    const response = await api.post('/tts/synthesize', 
      { text, voiceId },
      { responseType: 'blob' } // Important: receive binary audio data
    );
    return response.data;
  },
};
```

**File:** `frontend/src/pages/ChatPage.jsx` (MODIFY)

```jsx
// Add to imports at top
import { tts } from '../services/api';
import VoiceSelector from '../components/VoiceSelector';
import { Volume2, VolumeX } from 'lucide-react';

// Add state variables (inside ChatPage component)
const [ttsEnabled, setTtsEnabled] = useState(false);
const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL'); // Default: Bella
const [isSpeaking, setIsSpeaking] = useState(false);
const audioRef = useRef(null); // For controlling playback

// Add function to play TTS audio
const playMessageAudio = async (text) => {
  if (!ttsEnabled || !text || isSpeaking) return;
  
  try {
    setIsSpeaking(true);
    console.log('🔊 Generating speech for message...');
    
    // Truncate very long messages (ElevenLabs limit: 5000 chars)
    const truncatedText = text.length > 5000 
      ? text.substring(0, 4997) + '...' 
      : text;
    
    const audioBlob = await tts.synthesize(truncatedText, selectedVoice);
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create and play audio
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setIsSpeaking(false);
      console.log('✅ Speech playback completed');
    };
    
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      setIsSpeaking(false);
      console.error('❌ Audio playback error:', e);
      toast.error('Failed to play audio');
    };
    
    await audio.play();
    
  } catch (error) {
    setIsSpeaking(false);
    console.error('❌ TTS synthesis failed:', error);
    
    if (error.response?.data?.code === 'API_KEY_MISSING') {
      toast.error('ElevenLabs API key not configured');
    } else if (error.response?.data?.code === 'RATE_LIMIT_EXCEEDED') {
      toast.error('Voice synthesis rate limit reached. Please try again in a moment.');
    } else {
      toast.error('Could not generate speech');
    }
  }
};

// Add cleanup on unmount
useEffect(() => {
  return () => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
  };
}, []);

// Load TTS preferences on mount
useEffect(() => {
  const loadPreferences = async () => {
    try {
      const { data } = await authApi.getPreferences();
      if (data.tts_enabled !== undefined) {
        setTtsEnabled(data.tts_enabled);
      }
      if (data.tts_voice_id) {
        setSelectedVoice(data.tts_voice_id);
      }
    } catch (error) {
      console.error('Failed to load TTS preferences:', error);
    }
  };
  
  loadPreferences();
}, []);

// Save TTS preferences when changed
const handleTtsToggle = async (enabled) => {
  setTtsEnabled(enabled);
  
  try {
    await authApi.updatePreferences(null, null, null, { tts_enabled: enabled });
    toast.success(enabled ? 'Voice enabled' : 'Voice disabled');
  } catch (error) {
    console.error('Failed to save TTS preference:', error);
    toast.error('Failed to save preference');
  }
};

const handleVoiceChange = async (voiceId) => {
  setSelectedVoice(voiceId);
  
  try {
    await authApi.updatePreferences(null, null, null, { tts_voice_id: voiceId });
  } catch (error) {
    console.error('Failed to save voice preference:', error);
    toast.error('Failed to save voice preference');
  }
};

// Call playMessageAudio when AI response completes
// Find this section in your existing streaming handler:
if (data.done) {
  setStreamingMessage('');
  const assistantMessage = {
    id: data.messageId,
    role: 'assistant',
    content: fullResponse,
    model: data.model,
    created_at: new Date().toISOString(),
  };
  addMessage(assistantMessage);
  
  // ← ADD THIS: Auto-play TTS if enabled
  if (ttsEnabled && fullResponse) {
    playMessageAudio(fullResponse);
  }
  
  // ... rest of existing code (analytics, memory, etc.)
}

// ADD TTS CONTROLS TO CHAT HEADER
// Find the chat header section and add these controls:
<div className="flex items-center gap-2">
  {/* TTS Toggle Button */}
  <button
    onClick={() => handleTtsToggle(!ttsEnabled)}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
      ttsEnabled 
        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    } ${isSpeaking ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
    title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
  >
    {ttsEnabled ? (
      <>
        <Volume2 className="w-4 h-4" />
        <span className="text-sm">Voice On</span>
      </>
    ) : (
      <>
        <VolumeX className="w-4 h-4" />
        <span className="text-sm">Voice Off</span>
      </>
    )}
    {isSpeaking && (
      <span className="flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
    )}
  </button>
  
  {/* Voice Selector (only show when TTS enabled) */}
  {ttsEnabled && (
    <VoiceSelector 
      selectedVoice={selectedVoice}
      onVoiceChange={handleVoiceChange}
      className="w-48"
    />
  )}
</div>
```

---

#### Step 4: Database Schema Updates (30 minutes)

**File:** Create `backend/migrations/007_add_tts_preferences.sql` (NEW)

```sql
-- Add TTS preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tts_voice_id VARCHAR(255) DEFAULT 'EXAVITQu4vr4xnSDxMaL';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_tts 
ON user_preferences(user_id, tts_enabled);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.tts_enabled IS 'Whether text-to-speech is enabled for this user';
COMMENT ON COLUMN user_preferences.tts_voice_id IS 'Selected ElevenLabs voice ID for TTS playback';
```

**Run Migration:**

```bash
# Connect to database and run migration
psql $DATABASE_URL -f backend/migrations/007_add_tts_preferences.sql
```

**File:** `backend/src/routes/auth.js` (MODIFY preferences endpoint)

```javascript
// Update PUT /auth/preferences endpoint
router.put('/preferences', requireAuth, async (req, res) => {
  const userId = req.userId;
  const { preferences, tts_enabled, tts_voice_id } = req.body;
  
  try {
    // Update preferences including TTS settings
    const result = await db.query(
      `UPDATE user_preferences 
       SET 
         preferences = COALESCE($1, preferences),
         tts_enabled = COALESCE($2, tts_enabled),
         tts_voice_id = COALESCE($3, tts_voice_id),
         updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [
        preferences ? JSON.stringify(preferences) : null,
        tts_enabled,
        tts_voice_id,
        userId
      ]
    );
    
    if (result.rows.length === 0) {
      // Create if doesn't exist
      await db.query(
        `INSERT INTO user_preferences (user_id, preferences, tts_enabled, tts_voice_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, JSON.stringify(preferences || {}), tts_enabled || false, tts_voice_id || 'EXAVITQu4vr4xnSDxMaL']
      );
    }
    
    res.json({ 
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Update GET /auth/preferences to include TTS fields
router.get('/preferences', requireAuth, async (req, res) => {
  const userId = req.userId;
  
  try {
    const result = await db.query(
      `SELECT preferences, tts_enabled, tts_voice_id 
       FROM user_preferences 
       WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        preferences: {},
        tts_enabled: false,
        tts_voice_id: 'EXAVITQu4vr4xnSDxMaL'
      });
    }
    
    const prefs = result.rows[0];
    res.json({
      preferences: prefs.preferences || {},
      tts_enabled: prefs.tts_enabled || false,
      tts_voice_id: prefs.tts_voice_id || 'EXAVITQu4vr4xnSDxMaL'
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});
```

---

#### Step 5: Testing & Validation (60 minutes)

**Manual Testing Checklist:**

1. **Voice List Loading**
   - [ ] Open ChatPage
   - [ ] Click TTS toggle button
   - [ ] Verify voice dropdown appears
   - [ ] Verify voices load (should see names like "Rachel", "Bella", etc.)
   - [ ] Check console for errors

2. **Audio Playback**
   - [ ] Enable TTS
   - [ ] Send a short message to AI
   - [ ] Wait for AI response
   - [ ] Verify audio plays automatically
   - [ ] Verify speaking indicator shows during playback
   - [ ] Test stopping mid-playback (send another message)

3. **Voice Selection**
   - [ ] Change voice in dropdown
   - [ ] Send another message
   - [ ] Verify new voice is used
   - [ ] Refresh page
   - [ ] Verify voice selection persists

4. **Error Handling**
   - [ ] Remove ElevenLabs API key from admin dashboard
   - [ ] Try to enable TTS
   - [ ] Verify error message displays
   - [ ] Re-add API key
   - [ ] Verify TTS works again

5. **Mobile Testing**
   - [ ] Open on mobile device
   - [ ] Enable TTS
   - [ ] Send message
   - [ ] Verify audio plays (especially Safari iOS)
   - [ ] Check for layout issues

6. **Edge Cases**
   - [ ] Test with very long AI response (>1000 words)
   - [ ] Test with special characters in response
   - [ ] Test rapid message sending (queue behavior)
   - [ ] Test with TTS disabled mid-response

**Automated Tests (Optional but Recommended):**

```javascript
// tests/tts.spec.js - Playwright E2E test
import { test, expect } from '@playwright/test';

test.describe('ElevenLabs TTS Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Log In")');
    await page.waitForURL('/chat');
  });

  test('TTS toggle works', async ({ page }) => {
    // Find TTS button
    const ttsButton = page.locator('button:has-text("Voice")');
    await expect(ttsButton).toBeVisible();
    
    // Click to enable
    await ttsButton.click();
    await expect(ttsButton).toHaveText(/Voice On/);
    
    // Verify voice selector appears
    const voiceSelector = page.locator('select');
    await expect(voiceSelector).toBeVisible();
  });

  test('voice selection persists', async ({ page }) => {
    // Enable TTS
    await page.click('button:has-text("Voice")');
    
    // Select a voice
    await page.selectOption('select', { index: 1 });
    const selectedVoice = await page.locator('select').inputValue();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify voice is still selected
    const newSelectedVoice = await page.locator('select').inputValue();
    expect(newSelectedVoice).toBe(selectedVoice);
  });

  test('audio plays after AI response', async ({ page, context }) => {
    // Grant audio permissions
    await context.grantPermissions(['autoplay']);
    
    // Enable TTS
    await page.click('button:has-text("Voice")');
    
    // Send message
    await page.fill('textarea', 'Say hello');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('.message.assistant', { timeout: 15000 });
    
    // Verify speaking indicator appears
    await expect(page.locator('.animate-ping')).toBeVisible({ timeout: 5000 });
  });
});
```

---

### Cost Estimation & Usage Monitoring

**ElevenLabs Pricing (November 2025):**

| Plan | Monthly Cost | Characters | Cost per Message* |
|------|-------------|------------|-------------------|
| Free | $0 | 10,000 | $0 (~7 messages) |
| Starter | $5 | 30,000 | $0.0003 (~21 messages) |
| Creator | $22 | 100,000 | $0.0004 (~71 messages) |
| Pro | $99 | 500,000 | $0.0004 (~357 messages) |

*Assumes average AI response length: 1,400 characters

**Usage Monitoring:**

```javascript
// backend/src/routes/tts.js - Add usage tracking
let ttsUsageCount = 0;
let ttsCharacterCount = 0;

router.post('/synthesize', requireAuth, async (req, res) => {
  const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = req.body;
  
  // Track usage
  ttsUsageCount++;
  ttsCharacterCount += text.length;
  
  // Log warning if approaching limits
  if (ttsCharacterCount > 25000) {
    console.warn(`⚠️ TTS usage high: ${ttsCharacterCount} characters used this month`);
  }
  
  // ... rest of synthesis code
});

// Add usage endpoint for admin dashboard
router.get('/usage', requireAuth, async (req, res) => {
  // Only allow admins
  const user = await db.query('SELECT role FROM users WHERE id = $1', [req.userId]);
  if (user.rows[0]?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json({
    requests: ttsUsageCount,
    characters: ttsCharacterCount,
    estimatedCost: (ttsCharacterCount / 1000000) * 30, // $30 per 1M chars (Creator plan)
  });
});
```

**Recommendation:** Start with **Starter plan ($5/month)** for beta testing. Monitor usage via admin dashboard and upgrade to Creator if exceeding 30,000 characters/month.

---

## Part 2: Production Readiness Roadmap

### Critical Path to Production (P0 Tasks)

**Week 1: Testing & Observability (40 hours)**

| Task | Priority | Hours | Deliverable |
|------|----------|-------|-------------|
| Set up Playwright E2E tests | P0 | 8 | Auth + chat flow tests |
| Implement Sentry error tracking | P0 | 4 | Frontend + backend monitoring |
| Add rate limiting to messages | P0 | 2 | Prevent DoS attacks |
| WebSocket auth validation | P0 | 4 | Secure voice chat |
| Fix CSP for all streaming APIs | P0 | 2 | Unblock Gemini/ElevenLabs |
| Load testing with k6 | P0 | 8 | Identify breaking points |
| Database backup automation | P0 | 4 | AWS RDS snapshots |
| Health check endpoint | P0 | 2 | /api/health with DB ping |
| Create runbook documentation | P0 | 6 | Incident response guide |

**Week 2: UX Polish & Feature Completion (40 hours)**

| Task | Priority | Hours | Deliverable |
|------|----------|-------|-------------|
| Complete ElevenLabs TTS | P0 | 8 | Full voice integration |
| Voice chat button visibility | P1 | 2 | Prominent UI placement |
| Memory insights discoverability | P1 | 4 | Sidebar widget |
| Error toast retry buttons | P1 | 4 | Better error UX |
| Upload progress indicators | P1 | 4 | Real-time feedback |
| Mobile layout fixes (<400px) | P1 | 8 | Responsive design |
| Quick settings panel | P1 | 6 | In-chat preferences |
| API documentation (OpenAPI) | P1 | 4 | Developer reference |

**Total P0+P1 Investment:** 80 hours (~2 weeks)

---

### Production Deployment Checklist

**Pre-Deployment (1 week before):**
- [ ] All E2E tests passing (auth, chat, Google OAuth)
- [ ] Load test results reviewed (target: 50 concurrent users)
- [ ] Sentry error tracking verified
- [ ] Database backups automated (daily + weekly)
- [ ] Secrets rotation procedures documented
- [ ] Runbook completed and reviewed
- [ ] Health check endpoint returning 200 OK
- [ ] CSP updated for all external APIs

**Deployment Day:**
- [ ] Deploy to AWS (EC2 + RDS) or Replit Deployments
- [ ] Verify environment variables set correctly
- [ ] Run database migrations
- [ ] Test critical paths (login, chat, Google OAuth)
- [ ] Monitor error rates in Sentry (target: <1%)
- [ ] Set up uptime monitoring (UptimeRobot or similar)
- [ ] Configure alerting (PagerDuty or email)

**Post-Deployment (48 hours after):**
- [ ] Review error logs and fix critical issues
- [ ] Monitor API response times (target: p95 <500ms)
- [ ] Check database query performance
- [ ] Verify TTS usage within budget
- [ ] Collect user feedback on UX
- [ ] Update documentation with production URLs

---

## Part 3: Implementation Priorities

### This Week (Next 40 Hours)

**Monday-Tuesday: ElevenLabs TTS (8h)**
- Backend routes + CSP (4h)
- Frontend integration (4h)

**Wednesday: Testing Infrastructure (8h)**
- Playwright setup (2h)
- E2E auth tests (3h)
- E2E chat tests (3h)

**Thursday: Observability (8h)**
- Sentry integration (4h)
- Health check endpoint (2h)
- Usage monitoring (2h)

**Friday: Security Hardening (8h)**
- Rate limiting (2h)
- WebSocket auth (4h)
- Security audit review (2h)

**Weekend: UX Polish (8h)**
- Voice button visibility (2h)
- Memory insights widget (3h)
- Error retry buttons (3h)

---

## Part 4: Risk Matrix & Mitigation

### High-Risk Scenarios

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|-----------|-------|
| **Production outage with no monitoring** | HIGH | CRITICAL | Deploy Sentry + UptimeRobot ASAP | DevOps |
| **Data loss (no backups)** | MEDIUM | CRITICAL | Automate daily AWS RDS snapshots | DevOps |
| **TTS costs spiral out of control** | LOW | HIGH | Add usage cap + alerts at 80% quota | Dev |
| **Gemini API rate limit** | MEDIUM | HIGH | Implement exponential backoff retry | Dev |
| **CSRF token expiry during long sessions** | LOW | MEDIUM | Auto-refresh tokens every 30 min | Dev |
| **Mobile audio playback fails (Safari)** | MEDIUM | MEDIUM | Test on iOS + add fallback UI | QA |

---

## Part 5: Success Metrics

### Technical KPIs (Week 1-4)

| Metric | Baseline | Week 1 Target | Month 1 Target |
|--------|----------|---------------|----------------|
| **E2E Test Coverage** | 0% | 60% (auth + chat) | 80% (all flows) |
| **Error Rate** | Unknown | <2% | <1% |
| **API Response Time (p95)** | Unknown | <1s | <500ms |
| **Uptime** | Unknown | 99% | 99.9% |
| **TTS Adoption** | 0% | 10% | 30% |

### User Experience KPIs

| Metric | Baseline | Week 1 Target | Month 1 Target |
|--------|----------|---------------|----------------|
| **Time to First Message** | Unknown | <5s | <3s |
| **Voice Chat Usage** | Low | 15% | 25% |
| **Mobile Completion Rate** | Unknown | 70% | 85% |
| **Settings Engagement** | Low | 30% | 50% |
| **Support Tickets** | Unknown | <10/week | <5/week |

---

## Part 6: Quick Reference

### Important File Locations

**Backend:**
- `server.js` - CSP config, route registration
- `routes/tts.js` - NEW: TTS endpoints
- `routes/auth.js` - MODIFY: Add TTS preferences
- `services/elevenlabs.js` - Already exists
- `services/apiSecrets.js` - API key fallback logic

**Frontend:**
- `pages/ChatPage.jsx` - MODIFY: Add TTS controls
- `components/VoiceSelector.jsx` - NEW: Voice dropdown
- `services/api.js` - ADD: TTS API methods

**Database:**
- `migrations/007_add_tts_preferences.sql` - NEW: Schema update

### Environment Variables Needed

```bash
# Required for TTS
ELEVENLABS_API_KEY=<your-key-here>

# Required for production
JWT_SECRET=<64-char-hex>
HMAC_SECRET=<64-char-hex>
ENCRYPTION_KEY=<64-char-hex>
GEMINI_API_KEY=<your-key>
DATABASE_URL=<postgres-url>

# Recommended for monitoring
SENTRY_DSN=<your-dsn>
NODE_ENV=production
```

### Testing Commands

```bash
# Backend tests
npm test

# Frontend tests
npm run test:e2e

# Load tests
k6 run tests/load/chat.load.js

# Database migration
psql $DATABASE_URL -f backend/migrations/007_add_tts_preferences.sql
```

---

## Conclusion

**Summary:**
- **ElevenLabs TTS:** 6-9 hours to full implementation
- **Production Readiness:** 80 hours (2 weeks) for P0+P1 tasks
- **Total Investment:** ~90 hours to beta launch

**Next Action:** Begin with ElevenLabs TTS implementation (highest user value, lowest risk) while setting up testing infrastructure in parallel.

**Questions?** Review the full System Audit Report v2.0 for detailed technical analysis and architectural recommendations.

---

**END OF CONSULTANT PACKAGE**
