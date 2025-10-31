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

## Recent Changes

### UI-Aware AI Agent System (Latest)
1. **Schema Layer**: Created comprehensive UI metadata system (`backend/src/schemas/uiSchema.js`)
2. **Context Engine**: Middleware injects UI context into AI prompts (`backend/src/middleware/uiContext.js`)
3. **Action Execution**: 10 AI-executable actions with validation and audit logging
   - Navigate, create/switch/delete conversations, pin/rename, change model, voice, feedback
4. **Event Tracking**: User interaction tracking for AI context awareness
5. **Frontend Integration**: React hooks (`useUIActions`, `useEventTracking`)
6. **API Endpoints**: 
   - `/api/ui-schema` - UI metadata for AI
   - `/api/ui-actions/*` - Execute, validate, history
   - `/api/events/*` - Track, recent, since

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
