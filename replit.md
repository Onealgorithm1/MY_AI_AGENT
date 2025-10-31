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

## Architecture

```
Frontend (React + Vite) → Backend (Node.js + Express) → PostgreSQL Database
                                ↓
                        OpenAI API (GPT-4o + Realtime + Whisper + TTS)
```

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

The application uses 11 PostgreSQL tables:
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

## Key Features Implemented

1. **Authentication**: JWT-based auth with bcrypt password hashing
2. **Chat Interface**: Streaming responses, multiple conversations, model selection
3. **Voice Chat**: Real-time voice via WebSocket using OpenAI Realtime API
4. **File Upload**: Support for images, PDFs, documents with AI vision
5. **Memory System**: AI automatically extracts and remembers user facts
6. **Admin Dashboard**: User management, API usage stats, system monitoring
7. **Rate Limiting**: Message and voice usage limits per user
8. **Security**: Helmet middleware, CORS, encrypted secrets storage

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

## Recent Changes (Replit Setup)

1. Fixed database schema path in setup script
2. Configured Vite to run on port 5000 with host 0.0.0.0
3. Added `allowedHosts: true` to Vite config for Replit proxy
4. Updated backend to serve static files in production
5. Modified port configuration: dev uses 3000, production uses 5000
6. Added deployment configuration for Replit Autoscale
7. Created environment files for both frontend and backend

## User Preferences

Not yet configured - will be updated as preferences are learned.
