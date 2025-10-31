# My AI Agent - MVP

A full-stack AI chat application with real-time voice capabilities, powered by OpenAI GPT-4o.

## Project Overview

This is an AI chat application similar to ChatGPT, featuring:
- Modern React frontend with TailwindCSS
- Node.js/Express backend with WebSocket support
- PostgreSQL database for data persistence
- Real-time voice chat using OpenAI Realtime API
- File upload with AI vision capabilities
- User authentication and admin dashboard
- Memory system that remembers facts about users
- **UI-Aware AI Agent** - AI understands the interface and can guide users through workflows

## Architecture

```
Frontend (React + Vite) ←→ Backend (Node.js + Express) → PostgreSQL Database
        ↓                          ↓
   UI Actions               OpenAI API (GPT-4o + Realtime + Whisper + TTS)
   Event Tracking           UI Schema & Context Engine
```

### UI-Aware AI Agent System

The application features an intelligent AI agent that understands the user interface:

**Components:**
1. **UI Schema Layer** - Structured metadata for all UI components, pages, and workflows
2. **Context Engine** - Middleware that injects UI state and available actions into AI prompts
3. **LLM Orchestrator** - Enhanced system prompts with UI awareness
4. **Action Execution Layer** - API endpoints for AI to trigger UI commands
5. **Bidirectional Event System** - Tracks user actions and enables real-time UI updates

## Project Structure

```
myaiagent-mvp/
├── backend/           # Node.js backend API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # OpenAI, ElevenLabs integrations
│   │   ├── middleware/# Auth, rate limiting
│   │   ├── utils/     # Database, auth utilities
│   │   └── websocket/ # Voice WebSocket server
│   └── package.json
├── frontend/          # React frontend
│   ├── src/
│   │   ├── pages/     # Login, Chat, Admin pages
│   │   ├── services/  # API client
│   │   └── store/     # Zustand state management
│   └── package.json
└── database/          # PostgreSQL schema
    └── schema.sql
```

## Environment Setup

### Development Mode
- **Frontend**: Runs on port 5000 (Vite dev server)
- **Backend**: Runs on port 3000 (Express server)
- Frontend proxies API requests to backend

### Production Mode
- **Backend**: Runs on port 5000, serves both API and static frontend files
- Frontend is built and served from backend's static file server

## Database Schema

The application uses 13 PostgreSQL tables:
- `users` - User accounts with role-based access
- `conversations` - Chat conversations
- `messages` - Chat messages with streaming support
- `memory_facts` - AI memory system
- `attachments` - Uploaded files
- `feedback` - User feedback on AI responses
- `usage_tracking` - Daily usage limits
- `voice_sessions` - Voice call history
- `error_logs` - Error tracking
- `performance_metrics` - Performance monitoring
- `api_secrets` - Encrypted API keys storage
- **`ui_actions`** - AI agent action execution audit trail
- **`user_events`** - User interaction tracking for AI context

## Key Features Implemented

1. **Authentication**: JWT-based auth with bcrypt password hashing
2. **Chat Interface**: Streaming responses, multiple conversations, model selection
3. **Voice Chat**: Real-time voice via WebSocket using OpenAI Realtime API
4. **File Upload**: Support for images, PDFs, documents with AI vision
5. **Memory System**: AI automatically extracts and remembers user facts
6. **Admin Dashboard**: User management, API usage stats, system monitoring
7. **Rate Limiting**: Message and voice usage limits per user
8. **Security**: Helmet middleware, CORS, encrypted secrets storage
9. **UI-Aware AI Agent**: AI understands interface structure and can execute UI actions
10. **Bidirectional Events**: Tracks user actions and enables AI-triggered UI updates

## Default Credentials

**Email**: admin@myaiagent.com  
**Password**: admin123

⚠️ **IMPORTANT**: Change this password after first login!

## API Keys Required

To use the application, you need:
1. **OpenAI API Key** (required) - For GPT-4o, voice, vision features
2. **ElevenLabs API Key** (optional) - For premium TTS

Add API keys through the Admin Dashboard → API Keys tab after logging in.

## Configuration Files

- `backend/.env` - Backend environment variables (DATABASE_URL, JWT_SECRET, etc.)
- `frontend/.env` - Frontend environment variables (API URLs, default model)
- `vite.config.js` - Vite configuration with proxy and port 5000 setup
- `server.js` - Express server with static file serving for production

## Deployment

The project is configured for Replit Autoscale deployment:
- **Build**: Installs frontend dependencies and builds React app
- **Run**: Installs backend dependencies and starts server in production mode
- **Port**: 5000 (serves both frontend and API in production)

## Recent Changes & Update History

### Latest Update: Intelligent Model Selection & Streaming Function Calling (October 31, 2025)

**Major Feature Addition: AI Agent can now intelligently select models and execute UI actions**

**Problems Solved:**
- Users wanted AI to automatically switch models based on task complexity
- AI would say "I'll switch to GPT-3.5" but wouldn't actually execute the action
- No cost optimization - all queries used expensive models
- **CRITICAL FIX**: AI was calling functions for every message instead of just conversing normally

**Solution Implemented:**

1. **Intelligent Model Selection Service** (`backend/src/services/modelSelector.js`)
   - Analyzes query complexity, length, keywords, and task type
   - Auto-selects optimal model:
     - `gpt-4o-mini` for simple questions (cost efficient)
     - `o1-preview` for complex reasoning tasks
     - `gpt-4o` for multimodal/vision tasks
   - Provides explanations for model selection
   
2. **Auto Mode in Model Dropdown**
   - Added "Auto 🤖" option (set as default)
   - Shows all 6 OpenAI models with descriptions and cost indicators:
     - gpt-4o (Most capable, vision & audio)
     - gpt-4o-mini (Fast & affordable) ⭐
     - gpt-4-turbo (Previous flagship)
     - gpt-3.5-turbo (Legacy, cheapest) 💰
     - o1-preview (Best reasoning) 🧠
     - o1-mini (Faster reasoning)
   
3. **Streaming Function Calling Support**
   - **Critical Fix**: Function calling now works in streaming mode (used by frontend)
   - AI can execute 10 UI actions during streaming:
     - changeModel, navigate, createNewChat, switchConversation
     - deleteConversation, pinConversation, renameConversation
     - uploadFile, startVoiceChat, giveFeedback
   - Backend detects function_call deltas, accumulates arguments, executes actions
   - Frontend receives action payload and updates UI automatically
   - Shows toast confirmations when actions execute
   
4. **End-to-End Flow**
   - User: "Switch to GPT-3.5"
   - AI calls: `changeModel({model: "gpt-3.5-turbo"})`
   - Backend: Executes action, validates ownership
   - Frontend: Updates dropdown, shows toast "Switched to gpt-3.5-turbo"
   - Database: Logs action execution in ui_actions table

**Technical Implementation:**
```
Files Modified:
- backend/src/routes/messages.js (streaming + non-streaming function support)
- backend/src/services/modelSelector.js (new intelligent selector)
- backend/src/services/uiFunctions.js (UI action definitions)
- backend/src/services/openai.js (function calling integration)
- frontend/src/pages/ChatPage.jsx (action handler + model dropdown)
```

**Architect Reviews:**
- ✅ First review: Identified streaming didn't support function calling
- ✅ Second review: Confirmed streaming fix works end-to-end
- ✅ Security: Proper validation and ownership checks
- ✅ Production-ready

**Impact:**
- 💰 Automatic cost optimization (simple queries use gpt-4o-mini)
- 🎯 AI can now execute actions, not just describe them
- 🚀 Seamless UX - model switches happen instantly
- 📊 All actions logged for audit trail

---

### Enhanced System Prompt for Direct Action Execution (October 31, 2025)

**Problem Identified:**
- AI was responding passively, saying "I cannot delete conversations" or "Click the button to..."
- AI didn't understand it had direct UI control capabilities
- Tests 8 and 9 failed - AI couldn't see current conversation or execute delete action

**Solution Implemented:**
- Updated system prompt in `backend/src/middleware/uiContext.js`
- Changed from "you can guide users" to **"you have DIRECT UI CONTROL"**
- Added explicit capability statements: "You CAN see current conversation" and "You CAN execute these actions"
- Listed all 10 executable actions with examples
- Added response templates showing AI should say "I'll do X for you" instead of giving instructions

**Technical Changes:**
```
File: backend/src/middleware/uiContext.js
Function: generateUIAwarePrompt()

Changed:
- "Do NOT claim you can click buttons or directly control the interface" 
To:
- "You have DIRECT UI CONTROL and can execute actions on behalf of users"

Added:
- ✅ ACTIONS YOU CAN EXECUTE section (10 actions listed)
- Examples of proactive responses ("I'll create...", "I'll switch...", "I'll start...")
- Rule clarifications: You CAN see conversation state, execute actions, navigate
```

**Impact:**
- AI now responds with "I'll do that for you" instead of "Click this button"
- AI acknowledges it can see current conversation
- AI offers to execute actions instead of just describing them
- Test results improved from 2 failures to expected 0 failures

**Files Modified:**
- `backend/src/middleware/uiContext.js` (system prompt enhancement)
- `UI_AGENT_TEST_SCRIPT.txt` (created comprehensive test suite)

---

### UI-Aware AI Agent System (October 31, 2025)

**Major Feature Addition: Complete UI-Awareness and Action Execution System**

1. **Schema Layer**: Created comprehensive UI metadata system
   - File: `backend/src/schemas/uiSchema.js`
   - Defines 7 workflows, 3 pages, multiple components
   - Provides structured data about entire UI
   
2. **Context Engine**: Middleware injects UI context into AI prompts
   - File: `backend/src/middleware/uiContext.js`
   - Automatically attaches UI state to every request
   - Generates UI-aware system prompts
   - Shows current page, visible components, available actions
   
3. **Action Execution Layer**: 10 AI-executable actions with validation
   - File: `backend/src/services/actionExecutor.js`
   - Actions: navigate, createNewChat, switchConversation, deleteConversation, pinConversation, renameConversation, changeModel, uploadFile, startVoiceChat, giveFeedback
   - Ownership validation (users can only modify their own data)
   - Parameter whitelisting (prevents injection attacks)
   - Database audit logging with success/failure tracking
   - File: `backend/src/routes/ui-actions.js` (API endpoints)
   
4. **Event Tracking System**: User interaction tracking
   - File: `backend/src/services/eventTracker.js`
   - Logs user actions for AI context awareness
   - File: `backend/src/routes/events.js` (API endpoints)
   
5. **Frontend Integration**: React hooks for actions and events
   - File: `frontend/src/hooks/useUIActions.js`
   - Executes AI-triggered actions
   - Updates React state (conversations, navigation)
   - Handles all 10 action types
   - File: `frontend/src/hooks/useEventTracking.js`
   - Tracks page views, clicks, message sending, voice actions
   
6. **Database Tables Added**:
   - `ui_actions` - Audit trail of action executions
   - `user_events` - User interaction tracking
   
7. **API Endpoints Added**:
   - `GET /api/ui-schema` - UI metadata for AI
   - `POST /api/ui-actions/execute` - Execute action
   - `POST /api/ui-actions/validate` - Validate action
   - `GET /api/ui-actions/available` - Get available actions
   - `GET /api/ui-actions/history` - Action history
   - `POST /api/events/track` - Log user event
   - `GET /api/events/recent` - Recent events
   - `GET /api/events/since` - Events since timestamp

**Architect Reviews:**
- ✅ All 5 tasks reviewed and approved
- ✅ Security validation passed
- ✅ All 10 actions properly wired
- ✅ Production-ready confirmation

**Testing:**
- Created comprehensive test script (UI_AGENT_TEST_SCRIPT.txt)
- 12 test cases covering all capabilities
- Identified and fixed system prompt issues

### Replit Setup
1. Fixed database schema path in setup script
2. Configured Vite to run on port 5000 with host 0.0.0.0
3. Added `allowedHosts: true` to Vite config for Replit proxy
4. Updated backend to serve static files in production
5. Modified port configuration: dev uses 3000, production uses 5000
6. Added deployment configuration for Replit Autoscale
7. Created environment files for both frontend and backend

## User Preferences

Not yet configured - will be updated as preferences are learned.
