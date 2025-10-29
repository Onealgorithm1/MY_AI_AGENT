# My AI Agent - MVP

A full-stack AI chat application with **real-time voice** capabilities, built with React and Node.js.

## ✨ Features

- 💬 **ChatGPT-like Interface** - Clean, modern UI
- 🎙️ **Real-Time Voice** - OpenAI Realtime API integration
- 🔐 **Secure Authentication** - JWT-based auth system
- 🧠 **Memory System** - AI remembers facts about users
- 📎 **File Upload** - Images and documents with AI vision
- 👍 **Feedback System** - Rate AI responses
- 🔑 **API Secrets Manager** - Encrypted storage for API keys
- 🎨 **Multiple Themes** - Light/dark mode
- 📊 **Admin Dashboard** - User management, stats, and monitoring
- 🚀 **Streaming Responses** - Word-by-word AI replies

## 🏗️ Architecture

```
Frontend (React + Vite)
    ↓
Backend API (Node.js + Express)
    ↓
PostgreSQL Database
    ↓
OpenAI API (GPT-4o + Realtime + Whisper + TTS)
ElevenLabs API (Optional - Premium TTS)
```

## 📋 Prerequisites

- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 14+ (https://www.postgresql.org/)
- OpenAI API Key (https://platform.openai.com/api-keys)

## 🚀 Quick Start

### 1. Database Setup

```bash
# Create database
createdb myaiagent

# Or using psql
psql -U postgres
CREATE DATABASE myaiagent;
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add:
# - DATABASE_URL=postgresql://user:password@localhost:5432/myaiagent
# - OPENAI_API_KEY=sk-proj-your-key-here
# - JWT_SECRET=generate-a-random-32-char-string
# - ENCRYPTION_KEY=generate-a-random-64-char-hex-string

# Generate secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Setup database
npm run setup-db

# Start server
npm start
```

Server will run on http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Default values should work for local development

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173

### 4. Login

Open http://localhost:5173 and login with:

**Email:** admin@myaiagent.com  
**Password:** admin123

⚠️ **IMPORTANT:** Change this password immediately!

## 🔑 Adding API Keys

1. Login to the app
2. Go to **Admin Dashboard** (if you're an admin)
3. Click **API Keys** tab
4. Add your OpenAI API key
5. (Optional) Add ElevenLabs key for premium TTS

## 📱 Key Features

### Chat Interface

- Create multiple conversations
- Switch between GPT-4o and GPT-4o-mini
- Real-time streaming responses
- Pin important conversations
- Export conversations

### Real-Time Voice

- Tap microphone to start voice mode
- Continuous conversation (like phone call)
- <500ms latency
- Can interrupt AI mid-sentence
- Auto voice detection
- 10-minute session limit

### Memory System

- AI automatically extracts facts about you
- View and manage your memory bank
- Facts persist across conversations
- Clear memory anytime

### File Upload

- Upload images, PDFs, documents
- AI analyzes images automatically
- Supports code files
- 20MB file size limit

### Admin Dashboard

- View all users and stats
- Monitor API usage and costs
- Manage API keys securely
- Track errors and performance
- System health monitoring

## 🛠️ Configuration

### Environment Variables

**Backend (.env):**
```bash
PORT=3000
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=...
ENCRYPTION_KEY=...
RATE_LIMIT_MESSAGES=100          # Messages per user per day
RATE_LIMIT_VOICE_MINUTES=30      # Voice minutes per user per day
VOICE_SESSION_MAX_MINUTES=10     # Max voice session length
MAX_FILE_SIZE_MB=20              # Max file upload size
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
```

## 📊 Database Schema

The app includes 11 database tables:

- `users` - User accounts
- `conversations` - Chat conversations
- `messages` - Chat messages
- `memory_facts` - AI memory system
- `attachments` - Uploaded files
- `feedback` - User feedback
- `usage_tracking` - Daily usage limits
- `voice_sessions` - Voice call history
- `error_logs` - Error tracking
- `performance_metrics` - Performance monitoring
- `api_secrets` - Encrypted API keys

## 🎨 Customization

### Change Branding

Edit `frontend/src/main.jsx`:
```javascript
// Change app name
<title>Your App Name</title>
```

### Add More AI Models

Edit `frontend/src/pages/ChatPage.jsx`:
```javascript
<select>
  <option value="gpt-4o">GPT-4o</option>
  <option value="gpt-4o-mini">GPT-4o Mini</option>
  <option value="claude-3-opus">Claude Opus</option>
</select>
```

### Modify Rate Limits

Edit `.env`:
```bash
RATE_LIMIT_MESSAGES=200  # Increase to 200/day
RATE_LIMIT_VOICE_MINUTES=60  # Increase to 60 min/day
```

## 🚀 Deployment

### Option 1: Railway (Easiest)

1. Push code to GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variables
6. Deploy!

### Option 2: Render

1. Create account at https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Add environment variables
5. Deploy

### Option 3: VPS (DigitalOcean, AWS, etc.)

```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql

# Clone repo
git clone your-repo
cd myaiagent-mvp

# Setup and run
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend

# Use PM2 for process management
npm install -g pm2
pm2 start backend/src/server.js --name api
pm2 start frontend -- serve dist -l 5173
pm2 save
```

## 📈 Scaling

**For 1K-10K users:**

- Use Redis for sessions
- Enable CDN for frontend
- Use load balancer for API
- Separate database server
- Enable auto-scaling

**For 10K+ users:**

- Kubernetes cluster
- Multi-region deployment
- Dedicated OpenAI endpoints
- Advanced caching
- Real-time monitoring

## 🐛 Troubleshooting

### Database connection failed
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check connection string
echo $DATABASE_URL
```

### OpenAI API errors
```bash
# Check API key in database
psql myaiagent -c "SELECT key_name, is_active FROM api_secrets;"

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### Voice not working
```bash
# Check WebSocket connection in browser console
# Make sure CORS is configured correctly
# Verify OpenAI Realtime API access
```

## 📝 License

MIT License - Feel free to use for personal or commercial projects

## 🙏 Support

For issues or questions:
1. Check the troubleshooting guide above
2. Review error logs in Admin Dashboard
3. Check browser console for errors

## 🎯 Next Steps

After MVP is working:

1. Add React Native mobile app
2. Implement Stripe payments
3. Add Google OAuth
4. Build Chrome extension
5. Add analytics
6. Implement A/B testing
7. Add team collaboration
8. Build API for third-party integrations

## 📚 Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Zustand, React Query
- **Backend:** Node.js, Express, WebSocket
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o, Whisper, TTS, Realtime API
- **Voice:** ElevenLabs (optional)
- **Auth:** JWT
- **Deployment:** Railway, Render, or VPS

---

Built with ❤️ for the AI era
