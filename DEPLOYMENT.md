# EC2 Deployment Guide

This guide explains how to set up automatic deployment to your EC2 instance using GitHub Actions.

## Overview

The deployment workflow automatically:
1. Triggers on every push to the `main` branch
2. Builds the frontend for production
3. Packages the application
4. Deploys to your EC2 instance via SSH
5. Restarts application services

## Prerequisites

### On Your EC2 Instance

1. **Node.js 22** installed
2. **PM2 or systemd** for process management
3. **SSH access** configured
4. **Deployment directory** created (e.g., `/var/www/werkules`)

### GitHub Repository

Required repository secrets must be configured.

---

## Step 1: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_SSH_KEY` | Private SSH key for EC2 access | Contents of your `.pem` file |
| `EC2_HOST` | EC2 instance public IP or domain | `54.123.45.67` or `ec2.werkules.com` |
| `EC2_USER` | SSH username | `ubuntu`, `ec2-user`, or `admin` |
| `EC2_DEPLOY_PATH` | Deployment directory on EC2 | `/var/www/werkules` |

### How to Add Secrets

#### 1. EC2_SSH_KEY

```bash
# On your local machine, copy your EC2 private key
cat ~/path-to-your-key.pem
```

- Copy the **entire** contents (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
- Paste into GitHub secret `EC2_SSH_KEY`

#### 2. EC2_HOST

```bash
# Your EC2 public IP or domain
# Example: 54.123.45.67
```

#### 3. EC2_USER

Common values:
- **Ubuntu AMI**: `ubuntu`
- **Amazon Linux**: `ec2-user`
- **Debian**: `admin`

#### 4. EC2_DEPLOY_PATH

```bash
# Full path where application will be deployed
# Example: /var/www/werkules
```

---

## Step 2: Prepare Your EC2 Instance

### 1. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-host
```

### 2. Install Node.js 22

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

### 3. Install PM2 (Process Manager)

```bash
npm install -g pm2

# Enable PM2 startup script
pm2 startup
# Follow the command output to enable PM2 on system boot

# Save PM2 process list
pm2 save
```

### 4. Create Deployment Directory

```bash
sudo mkdir -p /var/www/werkules
sudo chown -R $USER:$USER /var/www/werkules
chmod -R 755 /var/www/werkules
```

### 5. Setup Environment Variables

Create `.env` files for backend and frontend:

```bash
# Backend environment
cat > /var/www/werkules/backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/werkules
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here

# Add other required environment variables
OPENAI_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
EOF

# Set proper permissions
chmod 600 /var/www/werkules/backend/.env
```

### 6. Configure PM2 Ecosystem

Create PM2 configuration:

```bash
cat > /var/www/werkules/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'werkules-backend',
      script: './backend/server.js',
      cwd: '/var/www/werkules',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/werkules/backend-error.log',
      out_file: '/var/log/werkules/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    }
  ]
};
EOF
```

### 7. Setup Logging Directory

```bash
sudo mkdir -p /var/log/werkules
sudo chown -R $USER:$USER /var/log/werkules
```

### 8. Configure Nginx (if using)

```bash
sudo nano /etc/nginx/sites-available/werkules
```

```nginx
server {
    listen 80;
    server_name werkules.com www.werkules.com;

    # Frontend - serve static files
    location / {
        root /var/www/werkules/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy to Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/werkules /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL with Let's Encrypt

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

sudo certbot --nginx -d werkules.com -d www.werkules.com
```

---

## Step 3: Test the Deployment

### Manual Deployment Test

Push a commit to the `main` branch:

```bash
git add .
git commit -m "Test deployment workflow"
git push origin main
```

### Monitor Deployment

1. Go to GitHub → **Actions** tab
2. Click on the running workflow
3. Watch the deployment logs in real-time

### Verify Deployment on EC2

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-host

# Check PM2 processes
pm2 list
pm2 logs werkules-backend

# Check application logs
tail -f /var/log/werkules/backend-out.log

# Test the application
curl http://localhost:3000/api/health
```

---

## Step 4: Workflow Features

### Automatic Triggers

- **Push to main**: Automatic deployment
- **Manual trigger**: Can be triggered from GitHub Actions tab

### Build Process

1. Checks out code
2. Sets up Node.js 22
3. Installs frontend dependencies
4. Builds frontend for production
5. Creates deployment package

### Deployment Process

1. Configures SSH connection
2. Uploads deployment package to EC2
3. Extracts and syncs files
4. Installs dependencies
5. Restarts services via PM2 or systemd

### Error Handling

- Cleans up sensitive files (SSH keys)
- Provides deployment notifications
- Shows detailed error messages on failure

---

## Troubleshooting

### SSH Connection Fails

**Check SSH key permissions:**
```bash
# GitHub Actions sets this automatically, but for manual testing:
chmod 600 ~/.ssh/your-key.pem
```

**Verify security group:**
- EC2 Security Group must allow SSH (port 22) from GitHub Actions IPs
- Or allow from all IPs: 0.0.0.0/0 (less secure)

### Deployment Fails

**Check deployment logs:**
```bash
ssh -i your-key.pem ubuntu@your-ec2-host
tail -f /var/log/werkules/backend-error.log
pm2 logs werkules-backend --err
```

**Check disk space:**
```bash
df -h
```

**Check process status:**
```bash
pm2 status
pm2 describe werkules-backend
```

### Application Won't Start

**Check environment variables:**
```bash
cat /var/www/werkules/backend/.env
```

**Check Node.js version:**
```bash
node --version  # Should be v22.x.x
```

**Check dependencies:**
```bash
cd /var/www/werkules/backend
npm ci
```

**Test manually:**
```bash
cd /var/www/werkules/backend
node server.js
```

### Build Fails

**Check GitHub Actions logs:**
- Go to Actions tab
- Click on failed workflow
- Expand failed step to see error

**Common issues:**
- Missing dependencies in package.json
- Build script errors
- Environment variables not set

---

## Alternative: Systemd Service

If you prefer systemd instead of PM2:

### Create systemd service file

```bash
sudo nano /etc/systemd/system/werkules-backend.service
```

```ini
[Unit]
Description=Werkules Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/werkules/backend
Environment=NODE_ENV=production
EnvironmentFile=/var/www/werkules/backend/.env
ExecStart=/home/ubuntu/.nvm/versions/node/v22.0.0/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/werkules/backend-out.log
StandardError=append:/var/log/werkules/backend-error.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable werkules-backend
sudo systemctl start werkules-backend
sudo systemctl status werkules-backend
```

Update the workflow to use systemd:

Change the restart command in `.github/workflows/deploy-to-ec2.yml`:

```yaml
# Replace PM2 restart with:
sudo systemctl restart werkules-backend
```

---

## Security Best Practices

1. **SSH Keys**: Never commit private keys to the repository
2. **Environment Variables**: Store sensitive data in `.env` files on EC2
3. **File Permissions**: Set restrictive permissions on `.env` files (600)
4. **Security Groups**: Limit SSH access to known IPs when possible
5. **SSL/TLS**: Always use HTTPS in production (Let's Encrypt)
6. **Firewall**: Configure UFW or security groups properly

```bash
# Example UFW configuration
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Monitoring & Maintenance

### Check Application Health

```bash
# Application status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# View specific app logs
pm2 logs werkules-backend --lines 100
```

### Database Backups

Set up automated backups:

```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump werkules > $BACKUP_DIR/werkules_$DATE.sql
gzip $BACKUP_DIR/werkules_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "werkules_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

---

## Quick Reference

### Useful Commands

```bash
# Deploy manually (for testing)
gh workflow run deploy-to-ec2.yml

# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-host

# Restart application
pm2 restart werkules-backend

# View logs
pm2 logs werkules-backend

# Update code manually
cd /var/www/werkules
git pull origin main
cd backend && npm ci
pm2 restart werkules-backend

# Check service status
systemctl status werkules-backend  # if using systemd
pm2 status  # if using PM2
```

---

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. SSH to EC2 and check application logs
3. Verify all secrets are correctly configured
4. Ensure EC2 security groups allow necessary traffic
5. Check environment variables are properly set
