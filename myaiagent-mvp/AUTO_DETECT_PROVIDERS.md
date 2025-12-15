# Auto-Detect Available AI Providers

## Overview

This feature automatically detects which AI providers are available based on configured API keys in the admin panel. Users can only connect providers for which API keys have been configured.

## How It Works

### Architecture

```
User adds API key in Admin Settings
          ↓
API key saved to api_secrets table
          ↓
Frontend calls /api/ai-agents/available-providers
          ↓
Backend checks which services have API keys
          ↓
Maps services to AI providers
          ↓
Returns available and unavailable providers
          ↓
Frontend displays only available providers
```

### Provider to API Key Mapping

| AI Provider | Required API Service | API Key Name |
|-------------|----------------------|--------------|
| OpenAI | OpenAI | OPENAI_API_KEY |
| Anthropic | Anthropic | ANTHROPIC_API_KEY |
| Google/Gemini | Google APIs, Google Cloud, or Google OAuth | GOOGLE_API_KEY |
| Cohere | Cohere | COHERE_API_KEY |
| Groq | Groq | GROQ_API_KEY |
| ElevenLabs | ElevenLabs | ELEVENLABS_API_KEY |

## Implementation Details

### Backend Changes

**New Endpoint: `GET /api/ai-agents/available-providers`**

Returns:
```json
{
  "available": [
    {
      "id": 1,
      "providerName": "openai",
      "displayName": "OpenAI",
      "logoUrl": "...",
      "docsUrl": "...",
      "authType": "api_key",
      "supportedModels": [...],
      "configSchema": {...},
      "hasApiKey": true
    },
    ...
  ],
  "unavailable": [
    {
      "id": 2,
      "providerName": "anthropic",
      "displayName": "Anthropic",
      "hasApiKey": false
    },
    ...
  ],
  "configuredServices": ["OpenAI", "Google APIs"],
  "summary": {
    "availableCount": 2,
    "unavailableCount": 4,
    "totalConfigured": 2
  }
}
```

**Key Features:**
- Checks `api_secrets` table for configured API keys
- Maps service names to provider names
- Returns both available and unavailable providers
- Includes summary statistics
- Cached for 1 hour

### Frontend Changes

**API Service (`services/api.js`)**
```javascript
// Get available providers (auto-detected)
aiAgents.getAvailableProviders()

// Get user's connected agents
aiAgents.getMyAgents()

// Connect a new agent
aiAgents.connectAgent({ providerName, agentName, model, apiKey })

// All other agent operations
```

**Components Updated:**

1. **AIAgentsPage.jsx**
   - Loads available providers instead of all providers
   - Shows helpful error messages if no providers configured
   - Displays loading state and error handling

2. **ConnectAIAgentModal.jsx**
   - Only shows available providers (with API keys)
   - Shows message if no providers configured
   - Links to admin settings to add API keys
   - Displays "✓ API Key Configured" badge

3. **AIAgentSelector.jsx**
   - Better error handling
   - Clear messaging about what's needed

## User Flow

### Scenario 1: User has OpenAI and Anthropic API keys configured

1. User opens `/ai-agents` page
2. Frontend calls `/api/ai-agents/available-providers`
3. Backend checks `api_secrets` table, finds OpenAI and Anthropic keys
4. Returns list of 2 available providers
5. User sees "Connect OpenAI" and "Connect Anthropic" buttons
6. User selects OpenAI, enters agent name and model
7. Agent is created and saved

### Scenario 2: User hasn't configured any API keys

1. User opens `/ai-agents` page
2. Frontend calls `/api/ai-agents/available-providers`
3. Backend finds no API keys configured
4. Returns empty "available" list, full "unavailable" list
5. User sees message: "No AI Providers Configured"
6. User sees button: "Go to Admin Settings"
7. User navigates to admin panel, adds OpenAI API key
8. User returns to `/ai-agents`, now sees OpenAI available
9. User connects OpenAI agent

## How to Deploy

### Step 1: Deploy Backend Code

```bash
cd myaiagent-mvp
flyctl deploy --no-cache
```

Verify deployment:
```bash
flyctl logs -f
# Should see: "Server running on port 3000"
```

### Step 2: Test the Endpoint

```bash
# Get authentication token first (log in via UI)
TOKEN="your_jwt_token_here"

# Test the endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.fly.dev/api/ai-agents/available-providers

# Should return JSON with "available", "unavailable", and "summary"
```

### Step 3: Verify in UI

1. Log in to your application
2. Go to Admin Settings and add an API key (e.g., OpenAI)
3. Navigate to `/ai-agents` page
4. Should see the corresponding provider in the available list
5. Click "Connect Agent" and the provider should be available

## Testing Locally

```bash
# Start backend
cd myaiagent-mvp/backend
npm run dev

# In another terminal, start frontend
cd myaiagent-mvp/frontend
npm run dev

# Log in and test at http://localhost:5000/ai-agents
```

## API Usage Examples

### Get Available Providers

```javascript
import { aiAgents } from './services/api.js';

// Get only providers with configured API keys
const response = await aiAgents.getAvailableProviders();
console.log(response.available); // Array of available providers
console.log(response.unavailable); // Array of unavailable providers
console.log(response.summary); // { availableCount: 2, unavailableCount: 4, totalConfigured: 2 }
```

### Connect an Agent

```javascript
const agent = await aiAgents.connectAgent({
  providerName: 'openai',
  agentName: 'My ChatGPT',
  model: 'gpt-4o',
  apiKey: 'sk-...' // Optional if already configured in admin
});
```

### Manage Agents

```javascript
// Get all agents
const response = await aiAgents.getMyAgents();

// Set as default
await aiAgents.setDefaultAgent(agentId);

// Test connectivity
await aiAgents.testAgent(agentId);

// Update agent
await aiAgents.updateAgent(agentId, { agentName: 'New Name' });

// Delete agent
await aiAgents.deleteAgent(agentId);
```

## Benefits

✅ **Better UX** - Users only see providers they can actually use
✅ **Clear Guidance** - Shows what needs to be done to add new providers
✅ **Automatic Detection** - No manual configuration needed
✅ **Scalable** - Easy to add new providers
✅ **Error Prevention** - Can't try to connect without API key

## Troubleshooting

### "No AI Providers Configured" message

**Solution:** Add at least one API key in Admin Settings (Settings → API Keys)

### Provider appears but says "unavailable"

**Cause:** API key was deleted or deactivated
**Solution:** Go to Admin Settings and re-add the API key

### Endpoint returns 404

**Cause:** Backend not deployed or server not restarted
**Solution:** 
```bash
flyctl deploy --no-cache
flyctl restart
```

### Endpoint returns 500 error

**Cause:** Database error or missing table
**Solution:**
```bash
# Run migrations
flyctl ssh console
npm run migrate
```

## Future Enhancements

- [ ] Show estimated cost per provider
- [ ] Display usage limits and quotas
- [ ] Recommend providers based on user profile
- [ ] Allow users to set fallback providers
- [ ] Support for custom/local LLM providers
- [ ] Provider health check and status dashboard

## Files Modified

- ✅ `myaiagent-mvp/backend/src/routes/aiAgents.js` - Added available-providers endpoint
- ✅ `myaiagent-mvp/frontend/src/pages/AIAgentsPage.jsx` - Use available-providers
- ✅ `myaiagent-mvp/frontend/src/components/ConnectAIAgentModal.jsx` - Handle empty providers
- ✅ `myaiagent-mvp/frontend/src/components/AIAgentSelector.jsx` - Better error handling
- ✅ `myaiagent-mvp/frontend/src/services/api.js` - Add aiAgents endpoints

## Status

✅ **Ready for deployment** - All code changes complete and tested
