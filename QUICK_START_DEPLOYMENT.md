# ⚡ Quick Start: Auto-Deployment in 5 Minutes

Get auto-deployment working fast! Every push to `main` will automatically deploy to your server.

## 🚀 5-Step Setup

### Step 1: Add GitHub Secrets (2 min)
1. Go to: `https://github.com/Onealgorithm1/MY_AI_AGENT/settings/secrets/actions`
2. Click **New repository secret** for each:

```
SERVER_HOST = 3.144.201.118
SERVER_USER = ubuntu (or your SSH username)
SSH_PRIVATE_KEY = (paste your ~/.ssh/id_rsa contents)
```

To get your SSH key:
```bash
cat ~/.ssh/id_rsa
```
Copy everything including `-----BEGIN` and `-----END` lines.

---

### Step 2: Prepare Server (1 min)
SSH into your server and run:

```bash
ssh user@3.144.201.118

# Clone repo if not there
cd ~
git clone https://github.com/Onealgorithm1/MY_AI_AGENT.git
cd MY_AI_AGENT
git checkout main

# Install PM2
npm install -g pm2 serve

# Make script executable
chmod +x scripts/deploy.sh
```

---

### Step 3: Create .env Files (1 min)

**Backend** (.env):
```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend
nano .env
```

Paste this (update YOUR_PASSWORD and keys):
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/myaiagent
OPENAI_API_KEY=your-key-here
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here
CORS_ORIGINS=http://3.144.201.118:5173,http://3.144.201.118
```

**Frontend** (.env):
```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/frontend
cat > .env << 'EOF'
VITE_API_URL=http://3.144.201.118:3000/api
VITE_WS_URL=ws://3.144.201.118:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
EOF
```

---

### Step 4: Initial Deploy (1 min)
```bash
cd ~/MY_AI_AGENT
./scripts/deploy.sh
```

Wait for: `🎉 Deployment complete!`

---

### Step 5: Test Auto-Deploy (30 sec)
On your **local machine**:

```bash
# Make any small change
echo "# Test deployment" >> README.md

# Push to main
git add .
git commit -m "Test auto-deployment"
git push origin main
```

Watch it deploy at: `https://github.com/Onealgorithm1/MY_AI_AGENT/actions`

---

## ✅ Done!

Your app is live at:
- 🌐 Frontend: **http://3.144.201.118:5173**
- 🔌 Backend: **http://3.144.201.118:3000**

Every push to `main` now auto-deploys! 🎉

---

## 🔧 Quick Commands

```bash
# View running services
pm2 list

# View logs
pm2 logs

# Restart services
pm2 restart all

# Manual deploy
cd ~/MY_AI_AGENT && ./scripts/deploy.sh
```

---

📖 **Full Guide**: See [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md) for detailed instructions and troubleshooting.
