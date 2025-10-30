# 🚀 Auto-Deployment Setup Guide

This guide will help you set up **automatic deployment** so that every push to the `main` branch deploys to your server at `3.144.201.118`.

## Overview

The setup uses:
- **GitHub Actions**: Triggers deployment on every push
- **SSH**: Securely connects to your server
- **PM2**: Manages backend/frontend processes
- **Deployment Script**: Handles updates automatically

---

## 📋 Prerequisites

On your server (3.144.201.118):
- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ PostgreSQL running
- ✅ Git installed
- ✅ SSH access enabled

---

## 🔧 Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to your GitHub repository: `https://github.com/Onealgorithm1/MY_AI_AGENT`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SERVER_HOST` | Your server IP | `3.144.201.118` |
| `SERVER_USER` | SSH username | `ubuntu` or `root` |
| `SSH_PRIVATE_KEY` | Your SSH private key | Contents of `~/.ssh/id_rsa` |
| `SSH_PORT` | SSH port (optional) | `22` (default) |

### Getting Your SSH Private Key

On your **local machine** (where you SSH from):

```bash
# View your SSH private key
cat ~/.ssh/id_rsa

# Or generate a new one if needed
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

Copy the **entire output** (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) and paste it into the `SSH_PRIVATE_KEY` secret.

### Add Public Key to Server

Make sure your public key is on the server:

```bash
# On your local machine
ssh-copy-id user@3.144.201.118

# Or manually:
cat ~/.ssh/id_rsa.pub
# Then on server: add to ~/.ssh/authorized_keys
```

---

## 🖥️ Step 2: Prepare Your Server

SSH into your server and run these commands:

```bash
# SSH into server
ssh user@3.144.201.118

# Navigate to home directory
cd ~

# Clone repository if not already there
git clone https://github.com/Onealgorithm1/MY_AI_AGENT.git
cd MY_AI_AGENT

# Checkout main branch
git checkout main

# Install PM2 globally (if not installed)
npm install -g pm2

# Install serve for frontend (if not installed)
npm install -g serve

# Make deploy script executable
chmod +x scripts/deploy.sh
```

---

## 🔐 Step 3: Create Environment Files

Create `.env` files on the server:

### Backend .env

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend

cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/myaiagent

# OpenAI API Configuration
OPENAI_API_KEY=your-actual-openai-key-here

# Security Keys (IMPORTANT: Use the same keys you have locally!)
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# CORS Configuration
CORS_ORIGINS=http://3.144.201.118:5173,http://3.144.201.118

# Rate Limiting
RATE_LIMIT_MESSAGES=100
RATE_LIMIT_VOICE_MINUTES=30
VOICE_SESSION_MAX_MINUTES=10

# File Upload
MAX_FILE_SIZE_MB=20
EOF

# Edit with your actual values
nano .env
```

### Frontend .env

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/frontend

cat > .env << 'EOF'
VITE_API_URL=http://3.144.201.118:3000/api
VITE_WS_URL=ws://3.144.201.118:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
EOF
```

---

## 🗄️ Step 4: Setup Database

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend

# Install dependencies
npm install

# Run database setup
npm run setup-db
```

---

## 🚀 Step 5: Initial Deployment

Run the deployment script manually for the first time:

```bash
cd ~/MY_AI_AGENT
./scripts/deploy.sh
```

You should see:
```
✅ Backend deployed
✅ Frontend deployed
🎉 Deployment complete!
```

Check services are running:
```bash
pm2 list
```

View logs:
```bash
pm2 logs myaiagent-backend
pm2 logs myaiagent-frontend
```

---

## ✅ Step 6: Test Auto-Deployment

Now test that auto-deployment works:

1. **Make a small change** locally (e.g., add a comment to a file)
2. **Commit and push** to main:
   ```bash
   git add .
   git commit -m "Test auto-deployment"
   git push origin main
   ```
3. **Watch GitHub Actions**:
   - Go to: `https://github.com/Onealgorithm1/MY_AI_AGENT/actions`
   - You should see the deployment running
   - Wait for it to complete (green checkmark ✅)

4. **Verify the change** is live at `http://3.144.201.118:5173`

---

## 🔥 Firewall Configuration

Make sure ports are open on your server:

```bash
# Allow HTTP traffic on port 3000 (backend)
sudo ufw allow 3000/tcp

# Allow HTTP traffic on port 5173 (frontend)
sudo ufw allow 5173/tcp

# Check firewall status
sudo ufw status
```

If using AWS/cloud provider, also configure security groups to allow:
- **Port 3000** (backend API)
- **Port 5173** (frontend)
- **Port 22** (SSH)

---

## 📊 Monitoring & Management

### View Running Services
```bash
pm2 list
```

### View Logs
```bash
# Backend logs
pm2 logs myaiagent-backend

# Frontend logs
pm2 logs myaiagent-frontend

# All logs
pm2 logs
```

### Restart Services
```bash
# Restart backend
pm2 restart myaiagent-backend

# Restart frontend
pm2 restart myaiagent-frontend

# Restart all
pm2 restart all
```

### Stop Services
```bash
pm2 stop myaiagent-backend
pm2 stop myaiagent-frontend
```

### Auto-start on Server Reboot
```bash
# Save current PM2 processes
pm2 save

# Setup startup script
pm2 startup systemd
# Follow the instructions it prints
```

---

## 🐛 Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs: `https://github.com/Onealgorithm1/MY_AI_AGENT/actions`
2. Verify SSH connection works: `ssh user@3.144.201.118`
3. Check secrets are set correctly in GitHub

### Services Won't Start
```bash
# Check logs
pm2 logs

# Check if ports are already in use
sudo lsof -i :3000
sudo lsof -i :5173

# Kill processes on ports if needed
sudo kill -9 $(sudo lsof -t -i:3000)
sudo kill -9 $(sudo lsof -t -i:5173)

# Try manual deployment
cd ~/MY_AI_AGENT
./scripts/deploy.sh
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check database exists
psql -U postgres -l

# Test connection
psql -U postgres -d myaiagent
```

### Can't Access Frontend/Backend
```bash
# Check firewall
sudo ufw status

# Check if services are running
pm2 list

# Check server is listening
netstat -tuln | grep -E '3000|5173'
```

---

## 🎯 What Happens on Each Push

1. You push code to `main` branch
2. GitHub Actions triggers automatically
3. Connects to your server via SSH
4. Pulls latest code from GitHub
5. Runs `scripts/deploy.sh`:
   - Installs/updates dependencies
   - Builds frontend
   - Restarts backend with PM2
   - Restarts frontend with PM2
6. Your site is live with the latest changes! 🎉

---

## 🔄 Manual Deployment

If you ever need to deploy manually:

```bash
# SSH into server
ssh user@3.144.201.118

# Navigate to project
cd ~/MY_AI_AGENT

# Pull latest changes
git pull origin main

# Run deployment
./scripts/deploy.sh
```

---

## 📝 Notes

- The deployment script uses **PM2** to manage processes
- Logs are stored in `~/.pm2/logs/`
- Frontend is built as static files and served with `serve`
- Backend runs directly with Node.js via PM2
- All processes automatically restart on server reboot (if configured)

---

**Need Help?** Check the logs:
```bash
pm2 logs
```

Or review the deployment script:
```bash
cat ~/MY_AI_AGENT/scripts/deploy.sh
```
