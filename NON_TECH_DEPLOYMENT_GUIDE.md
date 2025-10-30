# 🎯 Auto-Deployment for Non-Tech Users
### Make Your Code Go Live Automatically - No Coding Skills Needed!

This guide will help you set up **automatic deployment**. This means: every time you save your code to GitHub, it will automatically appear on your live website at **3.144.201.118:5173**

**Time needed:** 15-20 minutes
**Skills needed:** None! Just follow each step exactly.

---

## 📱 What You'll Need

Before starting, have these ready:
- ✅ Your GitHub account login
- ✅ Access to your server at 3.144.201.118 (the login username and password)
- ✅ 15 minutes of uninterrupted time

---

# PART 1: Set Up GitHub Secrets (5 minutes)

## What are GitHub Secrets?
Think of them like passwords that GitHub uses to connect to your server automatically. You only set them up once.

---

### Step 1: Go to GitHub Settings

1. **Open your web browser** (Chrome, Firefox, Safari, etc.)

2. **Type this exact URL** in the address bar:
   ```
   https://github.com/Onealgorithm1/MY_AI_AGENT
   ```

3. **Press Enter**

4. You should see your project page. Look at the top menu.

5. **Click on "Settings"** (it's on the right side of the menu)
   - If you don't see Settings, you might not be logged in. Log in first.

---

### Step 2: Find the Secrets Page

1. On the **left sidebar**, scroll down until you see **"Secrets and variables"**

2. **Click on "Secrets and variables"** to expand it

3. **Click on "Actions"** underneath it

4. You should now see a page that says **"Actions secrets and variables"** at the top

5. Look for a green button that says **"New repository secret"**

---

### Step 3: Add Secret #1 - SERVER_HOST

1. **Click the green "New repository secret" button**

2. You'll see two boxes:
   - **Name** (top box)
   - **Secret** (big box below)

3. In the **Name** box, type exactly:
   ```
   SERVER_HOST
   ```
   ⚠️ **Important:** Type it EXACTLY like that - all capital letters, with underscore

4. In the **Secret** box, type your server's address:
   ```
   3.144.201.118
   ```

5. **Click the green "Add secret" button** at the bottom

6. You should see a green success message

---

### Step 4: Add Secret #2 - SERVER_USER

1. **Click "New repository secret"** again (the green button)

2. In the **Name** box, type exactly:
   ```
   SERVER_USER
   ```

3. In the **Secret** box, type your server username
   - Common usernames are: `ubuntu`, `ec2-user`, `root`, or `admin`
   - **Don't know your username?** Check the email when you set up your server, or ask whoever set it up

4. **Click "Add secret"**

---

### Step 5: Add Secret #3 - SSH_PRIVATE_KEY (This one is tricky!)

#### What is an SSH Key?
It's like a special password file on your computer that lets GitHub connect to your server securely.

#### Finding Your SSH Key:

**If you're on Mac or Linux:**

1. **Open Terminal**
   - Mac: Press `Cmd + Space`, type "Terminal", press Enter
   - Linux: Press `Ctrl + Alt + T`

2. **Type this command** and press Enter:
   ```bash
   cat ~/.ssh/id_rsa
   ```

3. You'll see a bunch of text that looks like this:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA... (lots of random letters and numbers)
   -----END RSA PRIVATE KEY-----
   ```

4. **Select ALL of this text** (from -----BEGIN to -----END)
   - Mac: Press `Cmd + A` to select all
   - Linux: Click and drag to select all

5. **Copy it**
   - Mac: Press `Cmd + C`
   - Linux: Press `Ctrl + Shift + C`

**If you're on Windows:**

1. **Open Command Prompt**
   - Press `Windows Key + R`
   - Type `cmd` and press Enter

2. **Type this command** and press Enter:
   ```
   type %USERPROFILE%\.ssh\id_rsa
   ```

3. **Select all the text** that appears (from -----BEGIN to -----END)

4. **Right-click** and choose **Copy**

---

#### Adding the SSH Key to GitHub:

1. Go back to your **GitHub browser tab**

2. **Click "New repository secret"** again

3. In the **Name** box, type exactly:
   ```
   SSH_PRIVATE_KEY
   ```

4. In the **Secret** box:
   - **Right-click** and choose **Paste**
   - OR press `Ctrl + V` (Windows/Linux) or `Cmd + V` (Mac)

5. Make sure you see:
   - `-----BEGIN RSA PRIVATE KEY-----` at the top
   - `-----END RSA PRIVATE KEY-----` at the bottom
   - Lots of random text in between

6. **Click "Add secret"**

---

### Step 6: Add Secret #4 - SSH_PORT (Optional but recommended)

1. **Click "New repository secret"** one more time

2. In the **Name** box, type exactly:
   ```
   SSH_PORT
   ```

3. In the **Secret** box, type:
   ```
   22
   ```
   (This is the standard port number for SSH)

4. **Click "Add secret"**

---

### ✅ Check Your Secrets

You should now see **4 secrets** listed:
- ✅ SERVER_HOST
- ✅ SERVER_USER
- ✅ SSH_PRIVATE_KEY
- ✅ SSH_PORT

**Great job!** Part 1 is done! Take a 2-minute break if you need it.

---

# PART 2: Set Up Your Server (10 minutes)

## What We're Doing:
We need to prepare your server (the computer at 3.144.201.118) to receive automatic updates.

---

### Step 1: Connect to Your Server

**What is SSH?** It's a way to control a remote computer using text commands.

#### On Mac or Linux:

1. **Open Terminal** (same as before)

2. **Type this command** (replace `ubuntu` with your username if different):
   ```bash
   ssh ubuntu@3.144.201.118
   ```

3. **Press Enter**

4. If you see a message like "Are you sure you want to continue connecting?", type:
   ```
   yes
   ```
   Then press Enter

5. **Enter your password** when asked
   - ⚠️ **Important:** You won't see the password as you type. That's normal! Just type it and press Enter

6. You're connected when you see something like:
   ```
   ubuntu@ip-172-31-45-67:~$
   ```

#### On Windows:

1. **Download PuTTY** if you don't have it:
   - Go to: https://www.putty.org/
   - Click "Download PuTTY"
   - Install it

2. **Open PuTTY**

3. In the **"Host Name"** box, type:
   ```
   3.144.201.118
   ```

4. Make sure **Port** is set to `22`

5. **Click "Open"**

6. If you see a security alert, click **"Yes"**

7. **Type your username** (like `ubuntu`) and press Enter

8. **Type your password** and press Enter
   - You won't see it as you type - that's normal!

9. You're connected when you see something like:
   ```
   ubuntu@ip-172-31-45-67:~$
   ```

---

### Step 2: Navigate to Home Directory

You should be connected to your server now. Let's make sure we're in the right place.

1. **Type this command** and press Enter:
   ```bash
   cd ~
   ```
   This takes you to your "home" folder.

2. **Type this command** and press Enter:
   ```bash
   pwd
   ```
   You should see something like `/home/ubuntu`

---

### Step 3: Check if Project Exists

Let's see if the project is already on your server.

1. **Type this command** and press Enter:
   ```bash
   ls
   ```
   This shows all folders in your current location.

2. **Look for "MY_AI_AGENT"** in the list

**If you see MY_AI_AGENT:**
- Skip to **Step 5** below

**If you DON'T see MY_AI_AGENT:**
- Continue to **Step 4** below

---

### Step 4: Download the Project (If Needed)

Only do this if you DIDN'T see MY_AI_AGENT in the previous step.

1. **Type this command** and press Enter:
   ```bash
   git clone https://github.com/Onealgorithm1/MY_AI_AGENT.git
   ```

2. Wait for it to finish. You'll see text scrolling. When it stops and you see the `$` again, it's done.

3. **Type this to verify** it worked:
   ```bash
   ls
   ```
   You should now see **MY_AI_AGENT** in the list.

---

### Step 5: Go Into the Project Folder

1. **Type this command** and press Enter:
   ```bash
   cd MY_AI_AGENT
   ```

2. **Type this to confirm** you're in the right place:
   ```bash
   pwd
   ```
   You should see: `/home/ubuntu/MY_AI_AGENT` (or similar)

---

### Step 6: Get Latest Code

1. **Type this command** and press Enter:
   ```bash
   git checkout main
   ```

2. **Then type this** and press Enter:
   ```bash
   git pull origin main
   ```

3. Wait for it to finish. You might see text like "Already up to date" or files being downloaded.

---

### Step 7: Install PM2 (Process Manager)

**What is PM2?** It's a tool that keeps your website running even if something crashes.

1. **Type this command** and press Enter:
   ```bash
   npm install -g pm2
   ```

2. Wait for it to install. You'll see progress bars and text scrolling. This might take 1-2 minutes.

3. When you see the `$` again, it's done.

4. **Type this command** and press Enter:
   ```bash
   npm install -g serve
   ```

5. Wait again for it to finish.

---

### Step 8: Make the Deployment Script Executable

1. **Type this command** and press Enter:
   ```bash
   chmod +x scripts/deploy.sh
   ```

2. No output means it worked! You'll just see the `$` again.

---

### ✅ Part 2 Complete!

Good job! Your server is now ready to receive automatic updates.

---

# PART 3: Create Configuration Files (5 minutes)

## What We're Doing:
We need to create 2 small files that tell your app how to connect to the database and other services.

---

### Step 1: Create Backend Configuration

You should still be connected to your server from Part 2.

1. **Type this command** and press Enter:
   ```bash
   cd ~/MY_AI_AGENT/myaiagent-mvp/backend
   ```

2. **Type this command** and press Enter:
   ```bash
   nano .env
   ```

3. A text editor will open. It might be blank or have some text.

4. **Press `Ctrl + K` multiple times** to delete any existing text (if there is any)

5. **Copy ALL of this text below:**
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:REPLACE_THIS_PASSWORD@localhost:5432/myaiagent
   OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_KEY
   JWT_SECRET=6887df267be6789c911ea8c10155913dfd213bef14f7c4227c288fbac68800b6
   ENCRYPTION_KEY=da9f4455f6e75bfb482e62c808e280c8cb67e6eef835b3703c3d0b5ee7b8f129
   CORS_ORIGINS=http://3.144.201.118:5173,http://3.144.201.118
   RATE_LIMIT_MESSAGES=100
   RATE_LIMIT_VOICE_MINUTES=30
   VOICE_SESSION_MAX_MINUTES=10
   MAX_FILE_SIZE_MB=20
   ```

6. **Right-click in the terminal** and choose **Paste**
   - Or press `Ctrl + Shift + V` (Linux) or `Cmd + V` (Mac)

7. Now you need to **replace 2 things**:

   **A. Replace the database password:**
   - Find the line: `DATABASE_URL=postgresql://postgres:REPLACE_THIS_PASSWORD@localhost...`
   - Use arrow keys to move to `REPLACE_THIS_PASSWORD`
   - Delete it and type your actual PostgreSQL password
   - **Don't know your password?** Check the email when you set up your server

   **B. Replace the OpenAI key:**
   - Find the line: `OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_KEY`
   - Use arrow keys to move to `REPLACE_WITH_YOUR_OPENAI_KEY`
   - Delete it and type your actual OpenAI API key
   - **Don't have one?** Get it from: https://platform.openai.com/api-keys

8. **Save the file:**
   - Press `Ctrl + O` (that's the letter O, not zero)
   - Press `Enter` to confirm
   - Press `Ctrl + X` to exit

---

### Step 2: Create Frontend Configuration

1. **Type this command** and press Enter:
   ```bash
   cd ~/MY_AI_AGENT/myaiagent-mvp/frontend
   ```

2. **Type this command** and press Enter:
   ```bash
   nano .env
   ```

3. The text editor opens again.

4. **Copy ALL of this text:**
   ```env
   VITE_API_URL=http://3.144.201.118:3000/api
   VITE_WS_URL=ws://3.144.201.118:3000/voice
   VITE_DEFAULT_MODEL=gpt-4o
   ```

5. **Right-click** and **Paste** (or `Ctrl + Shift + V`)

6. **Save the file:**
   - Press `Ctrl + O`
   - Press `Enter`
   - Press `Ctrl + X`

---

### ✅ Part 3 Complete!

Configuration files are set up!

---

# PART 4: Initial Deployment (5 minutes)

## What We're Doing:
We're going to run the deployment for the first time manually. After this, it will happen automatically!

---

### Step 1: Go to Project Root

1. **Type this command** and press Enter:
   ```bash
   cd ~/MY_AI_AGENT
   ```

---

### Step 2: Run the Deployment Script

1. **Type this command** and press Enter:
   ```bash
   ./scripts/deploy.sh
   ```

2. You'll see lots of text scrolling. This is normal! The script is:
   - Installing software
   - Building your website
   - Starting services

3. **Wait patiently.** This might take 3-5 minutes.

4. **Watch for this message at the end:**
   ```
   🎉 Deployment complete!
   ```

5. If you see that message, **SUCCESS!** 🎉

6. If you see errors instead, **take a screenshot** of the error and we can help you fix it.

---

### Step 3: Check if Services are Running

1. **Type this command** and press Enter:
   ```bash
   pm2 list
   ```

2. You should see a table with 2 rows:
   - `myaiagent-backend` - status should be `online`
   - `myaiagent-frontend` - status should be `online`

3. If both show `online`, you're good! ✅

---

### ✅ Part 4 Complete!

Your website is now live! Let's test it.

---

# PART 5: Test Your Live Website (2 minutes)

1. **Open your web browser**

2. **Type this URL** in the address bar:
   ```
   http://3.144.201.118:5173
   ```

3. **Press Enter**

4. You should see your website load! 🎉

---

# PART 6: Enable Auto-Deployment (5 minutes)

## What We're Doing:
The final step! We'll merge our changes to the main branch, which will enable automatic deployment.

---

### Step 1: Go Back to Your Local Computer

**Close your server connection:**
1. In the terminal where you were connected to your server, type:
   ```bash
   exit
   ```
2. Press Enter

You're now back on your local computer.

---

### Step 2: Open Terminal on Your Computer

**Mac/Linux:**
- Open Terminal (same as before)

**Windows:**
- Open Command Prompt or Git Bash

---

### Step 3: Go to Your Project Folder

1. **Type this command** and press Enter:
   ```bash
   cd ~/MY_AI_AGENT
   ```
   (If this doesn't work, navigate to wherever you have the project on your computer)

---

### Step 4: Merge to Main Branch

1. **Type this command** and press Enter:
   ```bash
   git checkout main
   ```

2. **Type this command** and press Enter:
   ```bash
   git pull origin main
   ```

3. **Type this command** and press Enter:
   ```bash
   git merge claude/bring-project-up-011CUdbVmN4Y1DE54nRftryE
   ```

4. **Type this command** and press Enter:
   ```bash
   git push origin main
   ```

---

### Step 5: Watch the Magic Happen!

1. **Open your web browser**

2. **Go to this URL:**
   ```
   https://github.com/Onealgorithm1/MY_AI_AGENT/actions
   ```

3. You should see a **yellow circle** next to "Deploy to Production"
   - Yellow = Running
   - Green checkmark = Success!
   - Red X = Failed

4. **Click on the yellow circle** to watch it in real-time

5. **Wait 3-5 minutes** for it to complete

6. When you see a **GREEN CHECKMARK ✅**, it worked!

---

# 🎉 YOU'RE DONE!

## What You've Accomplished:

✅ Set up GitHub secrets
✅ Prepared your server
✅ Created configuration files
✅ Deployed your website
✅ Enabled automatic deployment

## What Happens Now:

Every time you:
1. Make changes to your code
2. Save them to GitHub (push to main branch)
3. **The website automatically updates in 3-5 minutes!** 🚀

You never have to manually deploy again!

---

## 🆘 If Something Goes Wrong

### Common Issues:

**1. Can't connect to server (SSH)**
- Check your username and password
- Make sure you copied the right IP address (3.144.201.118)
- Ask whoever set up the server for login details

**2. Deployment script shows errors**
- Take a screenshot of the error
- Check that you entered the correct database password
- Check that you entered a valid OpenAI API key

**3. Website doesn't load**
- Wait 5 minutes and try again
- Check if services are running: `pm2 list` on the server
- Check server logs: `pm2 logs` on the server

**4. GitHub Actions fails**
- Go to: https://github.com/Onealgorithm1/MY_AI_AGENT/actions
- Click on the failed action
- Take a screenshot of the error
- Most common issue: incorrect SSH key in secrets

---

## 📞 Quick Reference Commands

**Connect to server:**
```bash
ssh ubuntu@3.144.201.118
```

**Check if services are running:**
```bash
pm2 list
```

**See what's happening (logs):**
```bash
pm2 logs
```

**Manually deploy again:**
```bash
cd ~/MY_AI_AGENT
./scripts/deploy.sh
```

**Exit server connection:**
```bash
exit
```

---

## 🎯 Testing Auto-Deployment

Want to test if auto-deployment works?

1. Make any small change to your code (add a comment, change text, etc.)
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Testing auto deployment"
   git push origin main
   ```
3. Watch at: https://github.com/Onealgorithm1/MY_AI_AGENT/actions
4. Wait 3-5 minutes
5. Check your website: http://3.144.201.118:5173
6. See your changes live! 🎉

---

**Congratulations!** You now have a professional auto-deployment setup! 🚀
