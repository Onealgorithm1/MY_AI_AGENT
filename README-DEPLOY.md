# 🚀 AWS EC2 Deployment Guide - My AI Agent

Complete step-by-step guide to deploy your AI chat application to AWS EC2.

## 📋 Prerequisites

Before starting, ensure you have:

1. **AWS Account** with EC2 access
2. **EC2 Instance Running** (Ubuntu 24.04, t3.small recommended)
3. **SSH Key** (`myaiagent-key.pem`) downloaded
4. **Security Group** configured with these ports:
   - Port 22 (SSH) - Your IP only
   - Port 80 (HTTP) - 0.0.0.0/0
   - Port 443 (HTTPS) - 0.0.0.0/0
5. **GitHub Repository** with your code

---

## 🔑 Required API Keys & Secrets

Prepare these before deployment:

- **Google Gemini API Key** - https://aistudio.google.com/app/apikey
- **Google Cloud Service Account** - For TTS/STT/Vision
- **Google Custom Search API** - For web search feature
- **Google OAuth Credentials** - For Gmail/Calendar/Drive integration
- **OpenAI API Key** (optional) - For voice chat features

---

## 📦 Deployment Steps

### Step 1: Push Code to GitHub

From your Replit workspace:

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - ready for AWS deployment"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/myaiagent.git
git branch -M main
git push -u origin main
```

---

### Step 2: Connect to Your EC2 Instance

```bash
# Set proper permissions on your SSH key
chmod 400 myaiagent-key.pem

# SSH into your EC2 instance
ssh -i myaiagent-key.pem ubuntu@3.144.201.118
```

---

### Step 3: Clone Repository on EC2

```bash
# Install git if needed
sudo apt update && sudo apt install -y git

# Clone your repository
cd ~
git clone https://github.com/YOUR_USERNAME/myaiagent.git
cd myaiagent
```

---

### Step 4: Run Automated Deployment Script

```bash
# Make the script executable
chmod +x myaiagent-mvp/deploy-aws.sh

# Run the deployment script
./myaiagent-mvp/deploy-aws.sh
```

**This script will automatically:**
- ✅ Update system packages
- ✅ Install Node.js 20 system-wide (via NodeSource repository)
- ✅ Install PostgreSQL database
- ✅ Create database and user
- ✅ Install PM2 (process manager with auto-start on reboot)
- ✅ Install Nginx (web server)
- ✅ Install all dependencies
- ✅ Build the React frontend
- ✅ Configure and start services with systemd persistence

---

### Step 5: Configure Environment Variables

After deployment, edit your `.env` file with your secrets:

```bash
cd ~/myaiagent/myaiagent-mvp/backend
nano .env
```

**Required Configuration:**

```env
NODE_ENV=production
PORT=5000

# Database (update password!)
DATABASE_URL=postgresql://myaiagent_user:YOUR_STRONG_PASSWORD@localhost:5432/myaiagent

# Generate these secrets (run: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
JWT_SECRET=your_generated_secret_here
HMAC_SECRET=your_generated_secret_here
CSRF_SECRET=your_generated_secret_here
ENCRYPTION_KEY=your_generated_secret_here

# Google API Keys
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CUSTOM_SEARCH_API_KEY=your_search_api_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id

# Google Cloud Service Account (choose one method)
# Method 1: Upload JSON file to EC2 and use path
GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/service-account-key.json

# Method 2: Or paste JSON directly
# GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# OAuth 2.0
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://3.144.201.118/api/auth/google/callback

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Update PostgreSQL Password

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Update the password
ALTER USER myaiagent_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
\q

# Restart backend to apply changes
pm2 restart myaiagent-backend
```

---

### Step 7: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View backend logs
pm2 logs myaiagent-backend

# Check Nginx status
sudo systemctl status nginx

# Test the API
curl http://localhost:5000/health
```

**Visit your app:** `http://3.144.201.118`

---

## 🔒 Step 8: Setup SSL/HTTPS (Optional but Recommended)

If you have a domain name:

```bash
# Point your domain to your EC2 IP address
# Then install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts
# Certbot will automatically configure Nginx for HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📱 Post-Deployment Configuration

### Update Google OAuth Redirect URIs

1. Go to Google Cloud Console → APIs & Credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized Redirect URIs:
   - `http://3.144.201.118/api/auth/google/callback`
   - `https://your-domain.com/api/auth/google/callback` (if using domain)

### Test All Features

- ✅ User registration & login
- ✅ AI chat with streaming
- ✅ Voice chat
- ✅ Gmail integration
- ✅ Calendar integration
- ✅ File uploads
- ✅ Web search

---

## 🔧 Useful Commands

### PM2 Management
```bash
pm2 status                          # View all processes
pm2 restart myaiagent-backend       # Restart backend
pm2 stop myaiagent-backend          # Stop backend
pm2 logs myaiagent-backend          # View logs
pm2 logs myaiagent-backend --lines 100  # Last 100 lines
pm2 save                            # Save PM2 state
```

### Nginx Management
```bash
sudo systemctl status nginx         # Check status
sudo systemctl restart nginx        # Restart Nginx
sudo nginx -t                       # Test configuration
sudo tail -f /var/log/nginx/access.log   # View access logs
sudo tail -f /var/log/nginx/error.log    # View error logs
```

### Database Management
```bash
sudo -u postgres psql               # Connect to PostgreSQL
\l                                  # List databases
\c myaiagent                        # Connect to database
\dt                                 # List tables
\q                                  # Quit
```

### Update Deployment
```bash
cd ~/myaiagent
git pull origin main
cd myaiagent-mvp/frontend
npm install && npm run build
sudo cp -r dist/* /var/www/myaiagent/
cd ../backend
npm install
pm2 restart myaiagent-backend
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs myaiagent-backend --err

# Common issues:
# 1. Missing environment variables - check .env
# 2. Database connection error - verify DATABASE_URL
# 3. Port already in use - check with: sudo lsof -i :5000
```

### Frontend shows 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart both services
pm2 restart myaiagent-backend
sudo systemctl restart nginx
```

### Database connection errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection
psql -U myaiagent_user -d myaiagent -h localhost

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Port issues
```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill -9 PID_NUMBER
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` files to GitHub**
2. **Use strong passwords** for database
3. **Keep system updated:** `sudo apt update && sudo apt upgrade -y`
4. **Enable firewall:**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```
5. **Regular backups** of database:
   ```bash
   pg_dump -U myaiagent_user myaiagent > backup.sql
   ```
6. **Monitor logs** regularly
7. **Use HTTPS** with SSL certificate

---

## 📊 Monitoring & Maintenance

### Set up monitoring
```bash
# Install htop for system monitoring
sudo apt install -y htop

# View system resources
htop

# Check disk space
df -h

# Check memory usage
free -h
```

### Database backups
```bash
# Create backup script
nano ~/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U myaiagent_user myaiagent > ~/backups/myaiagent_$DATE.sql
# Keep only last 7 days
find ~/backups -name "myaiagent_*.sql" -mtime +7 -delete
```

```bash
# Make executable
chmod +x ~/backup-db.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add line: 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## 💰 Cost Optimization

Your current setup (t3.small):
- **EC2 Instance:** ~$15/month
- **Data Transfer:** ~$1-5/month
- **Total:** ~$20/month

To reduce costs:
- Use t3.micro for testing (~$7/month)
- Use Reserved Instances for 1-year commitment (save 40%)
- Move database to AWS RDS (managed, but costs more)

---

## 🎉 Success!

Your AI chat application is now live on AWS! 

**Access your app:** `http://3.144.201.118`

For support or questions, refer to the troubleshooting section or check PM2/Nginx logs.

---

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)
