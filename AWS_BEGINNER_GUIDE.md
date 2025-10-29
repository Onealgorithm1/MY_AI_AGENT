# 🚀 AWS Server Setup for Complete Beginners

**Don't worry - this guide assumes you know NOTHING about servers!**

We'll set up your AI chat application on Amazon Web Services (AWS) step by step.

---

## What You'll Need

- ✅ AWS Account (you have this)
- ✅ Credit/Debit card (AWS requires one, even for free tier)
- ✅ Your OpenAI API key
- ⏱️ About 1 hour of time

---

## Part 1: Understanding What We're Doing

Think of this like setting up a computer in the cloud:

1. **Database (RDS)** = A filing cabinet that stores all your data
2. **Server (EC2)** = A computer that runs your application 24/7
3. **Your App** = The AI chat software we'll install on that computer

Let's start!

---

## Part 2: Create Your Database (The Easy Way)

### Step 1: Log into AWS

1. Go to: https://aws.amazon.com
2. Click **"Sign In to the Console"** (top right)
3. Enter your email and password
4. You should see the AWS Management Console (looks like a dashboard)

### Step 2: Open RDS (Database Service)

1. At the top, you'll see a search bar that says **"Search for services, features..."**
2. Type: **RDS**
3. Click on **"RDS"** (it says "Managed Relational Database Service")

### Step 3: Create Database

1. You'll see a page with "Amazon RDS" at the top
2. Look for an orange button that says **"Create database"**
3. Click it

### Step 4: Choose Database Type

Now you'll see a form with lots of options. Follow exactly:

**Engine options:**
- Click on **"PostgreSQL"** (it's a circle/radio button)

**Version:**
- Leave as default (should be PostgreSQL 14.something or 15.something)

**Templates:**
- Click **"Free tier"** (this saves money while testing!)

### Step 5: Settings Section

Scroll down to the **"Settings"** section:

**DB instance identifier:**
- Type: `myaiagent-db`
- (This is just the name of your database)

**Master username:**
- Leave as: `postgres`
- (This is the admin username)

**Master password:**
- Click **"Auto generate a password"** OR
- Click **"Self managed"** and create a password
- **IMPORTANT:** Write down this password! You'll need it later.
- Example password: `MyAIAgent2024!`

### Step 6: Instance Configuration

Scroll down to **"Instance configuration"**:

- Should already show **"db.t3.micro"** (this is free tier)
- Leave it as is

**Storage:**
- Leave everything as default (20 GiB is fine)

### Step 7: Connectivity (IMPORTANT!)

Scroll to **"Connectivity"**:

**Public access:**
- Click **"Yes"**
- (We need this so your server can talk to the database)

**VPC security group:**
- Click **"Create new"**
- New VPC security group name: `myaiagent-db-security`

### Step 8: Additional Configuration

Scroll down and click **"Additional configuration"** (it expands):

**Initial database name:**
- Type: `myaiagent`
- **Don't skip this!** If you don't see this field, make sure you expanded "Additional configuration"

**Backup:**
- Enable automatic backups: ✅ (leave checked)
- Backup retention period: 7 days (default is fine)

**Encryption:**
- Leave enabled (it's for security)

### Step 9: Create It!

1. Scroll all the way to the bottom
2. You'll see an orange button: **"Create database"**
3. Click it
4. You'll see a success message
5. If you chose auto-generate password, click **"View credential details"** and SAVE the password

**Wait 5-10 minutes** while AWS creates your database. You'll see a status that says "Creating..."

### Step 10: Get Database Connection Info

1. Stay on the RDS page
2. Click **"Databases"** in the left sidebar
3. Wait until the status says **"Available"** (refresh the page)
4. Click on **"myaiagent-db"** (the name you created)
5. Scroll to **"Connectivity & security"** section
6. Find **"Endpoint"** - it looks like: `myaiagent-db.abc123.us-east-1.rds.amazonaws.com`
7. **COPY THIS and save it in a notepad!** You'll need it later.

### Step 11: Open Database to Accept Connections

1. On the same page, under **"Connectivity & security"**
2. Find **"VPC security groups"**
3. Click on the security group link (looks like `sg-0abc123...`)
4. This opens a new tab showing security rules
5. At the bottom, click the **"Inbound rules"** tab
6. Click **"Edit inbound rules"** button
7. Click **"Add rule"**
8. For **Type**, select **"PostgreSQL"** from dropdown
9. For **Source**, select **"Anywhere-IPv4"** from dropdown
   - (In production, you'd restrict this, but for now we keep it simple)
10. Click **"Save rules"** (orange button at bottom right)

**Done!** Your database is ready! ✅

---

## Part 3: Create Your Server (EC2)

Now let's create the computer that will run your app.

### Step 1: Go to EC2

1. At the top search bar, type: **EC2**
2. Click **"EC2"** (says "Virtual Servers in the Cloud")

### Step 2: Launch Instance

1. You'll see the EC2 Dashboard
2. Look for an orange button: **"Launch instance"**
3. Click it
4. You might see a dropdown - click **"Launch instance"** again

### Step 3: Name Your Server

**Name and tags:**
- Under **"Name"**, type: `MyAIAgent-Server`

### Step 4: Choose Operating System

**Application and OS Images (Amazon Machine Image):**

1. You'll see several options (Amazon Linux, Ubuntu, Windows...)
2. Click on **"Ubuntu"**
3. Make sure it says **"Ubuntu Server 22.04 LTS"**
4. Should say **"Free tier eligible"** - perfect!

### Step 5: Choose Server Size

**Instance type:**

1. You'll see **"t2.micro"** with a **"Free tier eligible"** tag
2. **BUT** - for this app, we need more power
3. Click the dropdown and select **"t3.small"** (2GB RAM)
   - Note: This costs about $15/month, NOT free tier
   - If you want to try free tier first, use t2.micro, but app might be slow

### Step 6: Create Security Key (IMPORTANT!)

**Key pair (login):**

This is like a key to your server - you MUST have this to access it!

1. Click **"Create new key pair"**
2. A popup appears:
   - **Key pair name:** `myaiagent-key`
   - **Key pair type:** RSA (leave as is)
   - **Private key file format:**
     - If you use Mac/Linux: Choose **.pem**
     - If you use Windows: Choose **.pem** (you can convert later if needed)
3. Click **"Create key pair"**
4. A file downloads: `myaiagent-key.pem`
5. **SAVE THIS FILE!** Put it somewhere safe. If you lose it, you can't access your server!

### Step 7: Network Settings (IMPORTANT!)

**Network settings:**

1. Click **"Edit"** on the right side
2. You'll see a form

**Firewall (security groups):**
- Click **"Create security group"**
- Security group name: `myaiagent-server-sg`
- Description: `Security for AI Agent server`

**Inbound Security Group Rules:**

You'll see one rule already (SSH). We need to add more.

Click **"Add security group rule"** for EACH of these:

**Rule 1** (already there):
- Type: SSH
- Source type: Anywhere (or "My IP" for better security)

**Rule 2:**
- Click "Add security group rule"
- Type: Select **"HTTP"** from dropdown
- Source type: **"Anywhere"**

**Rule 3:**
- Click "Add security group rule"
- Type: Select **"HTTPS"** from dropdown
- Source type: **"Anywhere"**

**Rule 4:**
- Click "Add security group rule"
- Type: Select **"Custom TCP"**
- Port range: `3000`
- Source type: **"Anywhere"**
- Description: "Backend API"

**Rule 5:**
- Click "Add security group rule"
- Type: Select **"Custom TCP"**
- Port range: `5173`
- Source type: **"Anywhere"**
- Description: "Frontend"

### Step 8: Storage

**Configure storage:**
- Should show **"8 GiB gp3"** by default
- Change **8** to **20** (we need more space)
- Leave everything else as is

### Step 9: Review

**Summary** panel on the right shows:
- Instance type: t3.small
- Number of instances: 1
- Software Image: Ubuntu 22.04 LTS

Looks good!

### Step 10: Launch It!

1. On the right side, click the orange button: **"Launch instance"**
2. You'll see "Successfully initiated launch of instance"
3. Click **"View all instances"**

### Step 11: Wait for Server to Start

1. You'll see your instance with a **"Status check"** column
2. Wait until it says **"2/2 checks passed"** (takes 2-3 minutes)
3. **Instance state** should be **"Running"** (green dot)

### Step 12: Get Your Server Address

1. Click on your instance (click the checkbox or the instance ID)
2. Look at the **"Details"** tab below
3. Find and COPY these (save in notepad):
   - **Public IPv4 address** (looks like: `54.123.45.67`)
   - **Public IPv4 DNS** (looks like: `ec2-54-123-45-67.compute-1.amazonaws.com`)

**Done!** Your server is running! ✅

---

## Part 4: Connect to Your Server

Now we need to log into your server using your computer.

### For Mac Users:

1. Open **Terminal** (Applications → Utilities → Terminal)
2. Move your key file to a safe location:
   ```bash
   mkdir ~/.ssh
   mv ~/Downloads/myaiagent-key.pem ~/.ssh/
   chmod 400 ~/.ssh/myaiagent-key.pem
   ```
3. Connect to your server (replace `54.123.45.67` with YOUR server's IP):
   ```bash
   ssh -i ~/.ssh/myaiagent-key.pem ubuntu@54.123.45.67
   ```
4. Type `yes` when asked "Are you sure you want to continue connecting?"
5. You should now see a prompt like `ubuntu@ip-172-31-45-67:~$`

**You're in!** 🎉

### For Windows Users:

**Option 1: Use Windows Terminal (Windows 10/11)**

1. Open **Command Prompt** or **PowerShell**
2. Navigate to where you saved the key:
   ```cmd
   cd Downloads
   ```
3. Connect (replace `54.123.45.67` with YOUR server's IP):
   ```bash
   ssh -i myaiagent-key.pem ubuntu@54.123.45.67
   ```
4. If you get a permission error, you may need to use PuTTY (Option 2)

**Option 2: Use PuTTY**

1. Download PuTTY: https://www.putty.org/
2. Download PuTTYgen (comes with PuTTY)
3. Open **PuTTYgen**
4. Click **"Load"** and select your `myaiagent-key.pem` file
5. Click **"Save private key"** → Save as `myaiagent-key.ppk`
6. Open **PuTTY**
7. In **"Host Name"**, enter: `ubuntu@54.123.45.67` (use YOUR IP)
8. On left sidebar: Connection → SSH → Auth → Credentials
9. Click **"Browse"** and select your `.ppk` file
10. Click **"Open"**
11. Click "Yes" to trust the server

**You're in!** 🎉

---

## Part 5: Install Everything Needed

Now type these commands ONE BY ONE in your server terminal.

### Step 1: Update the Server

```bash
sudo apt update && sudo apt upgrade -y
```
*This updates all the software. Takes 2-3 minutes. Press Enter if asked anything.*

### Step 2: Install Node.js (JavaScript runtime)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
*Wait for it to finish (1-2 minutes)*

Check if it worked:
```bash
node --version
```
*Should show something like `v20.11.0`*

### Step 3: Install PostgreSQL Client (to talk to database)

```bash
sudo apt install -y postgresql-client
```

### Step 4: Install PM2 (keeps your app running)

```bash
sudo npm install -g pm2
```

### Step 5: Install Git (to download your code)

```bash
sudo apt install -y git
```

### Step 6: Install Nginx (web server)

```bash
sudo apt install -y nginx
```

**All software installed!** ✅

---

## Part 6: Download and Setup Your Application

### Step 1: Clone Your Code

```bash
cd /home/ubuntu
git clone https://github.com/Onealgorithm1/MY_AI_AGENT.git
cd MY_AI_AGENT/myaiagent-mvp
```

*If it asks for username/password, you may need to create a GitHub Personal Access Token*

### Step 2: Generate Security Keys

Run this command and SAVE the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output - this is your **JWT_SECRET**

Run it again:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy this output - this is your **ENCRYPTION_KEY**

### Step 3: Create Backend Configuration

```bash
cd backend
nano .env
```

*This opens a text editor. Type or paste this (replace the values in CAPS):*

```bash
NODE_ENV=production
PORT=3000

# Replace with your RDS endpoint from Part 2, Step 10
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/myaiagent

# Replace with your OpenAI API key
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY

# Replace with the keys you generated above
JWT_SECRET=your_generated_jwt_secret_here
ENCRYPTION_KEY=your_generated_encryption_key_here

# Replace YOUR_EC2_IP with your server IP from Part 3, Step 12
CORS_ORIGINS=http://YOUR_EC2_IP:5173,http://YOUR_EC2_IP

RATE_LIMIT_MESSAGES=100
RATE_LIMIT_VOICE_MINUTES=30
VOICE_SESSION_MAX_MINUTES=10
MAX_FILE_SIZE_MB=20
```

**Example of what it should look like:**
```bash
DATABASE_URL=postgresql://postgres:MyAIAgent2024!@myaiagent-db.abc123.us-east-1.rds.amazonaws.com:5432/myaiagent
OPENAI_API_KEY=sk-proj-abc123xyz789...
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
ENCRYPTION_KEY=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4
CORS_ORIGINS=http://54.123.45.67:5173,http://54.123.45.67
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` (yes to save)
- Press `Enter`

### Step 4: Install Backend Dependencies

```bash
npm install
```

*This takes 2-3 minutes. You'll see lots of text scrolling.*

### Step 5: Setup Database Tables

```bash
npm run setup-db
```

*This creates all the tables in your database. Should see "Database setup complete!"*

### Step 6: Start Backend Server

```bash
pm2 start src/server.js --name myaiagent-api
pm2 save
pm2 startup
```

*After the last command, it will show you another command to copy and run. Copy it and run it.*

Test if it's working:
```bash
curl http://localhost:3000/health
```

*Should show: `{"status":"ok"}`*

### Step 7: Setup Frontend

```bash
cd /home/ubuntu/MY_AI_AGENT/myaiagent-mvp/frontend
nano .env
```

*Type this (replace YOUR_EC2_IP with your server IP):*

```bash
VITE_API_URL=http://YOUR_EC2_IP:3000/api
VITE_WS_URL=ws://YOUR_EC2_IP:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
```

**Example:**
```bash
VITE_API_URL=http://54.123.45.67:3000/api
VITE_WS_URL=ws://54.123.45.67:3000/voice
VITE_DEFAULT_MODEL=gpt-4o
```

**Save:** `Ctrl + X`, `Y`, `Enter`

### Step 8: Build and Start Frontend

```bash
npm install
npm run build
```

*This takes 3-5 minutes. Builds your website.*

```bash
sudo npm install -g serve
pm2 start --name myaiagent-web "serve -s dist -l 5173"
pm2 save
```

---

## Part 7: Open Your Application!

### Test It!

1. Open your web browser (Chrome, Firefox, etc.)
2. Go to: `http://YOUR_EC2_IP:5173` (replace with your IP)
   - Example: `http://54.123.45.67:5173`

3. You should see the login page!

**Default Login:**
- Email: `admin@myaiagent.com`
- Password: `admin123`

**IT WORKS!** 🎉🎉🎉

---

## Part 8: Change the Admin Password (IMPORTANT!)

1. After logging in, go to your profile settings
2. Change the password from `admin123` to something secure

**OR** change it via terminal:

```bash
# Connect to your server if not already connected
# Then run:
psql "postgresql://postgres:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/myaiagent"

# In the database prompt, type:
UPDATE users
SET password_hash = crypt('YourNewPassword123!', gen_salt('bf'))
WHERE email = 'admin@myaiagent.com';

# Exit database:
\q
```

---

## 🎯 Quick Reference Card

**Save these for later:**

| What | Where | Value |
|------|-------|-------|
| Your App URL | Browser | `http://YOUR_EC2_IP:5173` |
| Login Email | | `admin@myaiagent.com` |
| Server IP | AWS EC2 | `YOUR_EC2_IP` |
| Database Endpoint | AWS RDS | `YOUR_RDS_ENDPOINT` |
| Server Login | Terminal | `ssh -i myaiagent-key.pem ubuntu@YOUR_EC2_IP` |

**Useful Commands (run on server):**

```bash
# View logs
pm2 logs

# Restart backend
pm2 restart myaiagent-api

# Restart frontend
pm2 restart myaiagent-web

# Check if services are running
pm2 status
```

---

## ❓ Common Issues

**Issue: Can't connect to server via SSH**
- Check if you're using the correct IP address
- Make sure your key file has correct permissions (`chmod 400`)
- Check if instance is running in AWS console

**Issue: Database connection failed**
- Check if RDS security group allows connections (Part 2, Step 11)
- Verify DATABASE_URL is correct in .env file
- Make sure RDS status is "Available"

**Issue: Website not loading**
- Check if pm2 services are running: `pm2 status`
- Check if port 5173 is open in EC2 security group
- Try restarting: `pm2 restart all`

**Issue: Can't login**
- Make sure you ran `npm run setup-db`
- Check database connection
- Try default credentials exactly as shown

---

## 🎉 Congratulations!

You just deployed a full AI application to the cloud!

**What you accomplished:**
- ✅ Created a cloud database
- ✅ Launched a cloud server
- ✅ Installed and configured software
- ✅ Deployed a full-stack application
- ✅ Made it accessible to the world!

**Next Steps:**
1. Explore your AI chat application
2. Go to Admin Dashboard and add your OpenAI API key
3. Start chatting with your AI!
4. Try voice mode, file uploads, and other features

**Want to learn more?** Check out the main README.md for advanced features!

---

**Need help?** Review this guide step by step. Most issues come from:
- Typos in configuration files
- Wrong IP addresses
- Missing security group rules
- Forgotten passwords

**You did it!** 🚀
