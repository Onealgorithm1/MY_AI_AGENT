# 🔐 GitHub Secrets Setup Guide

## What Are GitHub Secrets?

GitHub Secrets are **encrypted passwords** that GitHub Actions uses to connect to your AWS server and deploy code. Think of them like keys to your house - they stay safe with GitHub and are only used when deploying.

---

## 📋 Step-by-Step Setup (5 Minutes)

### Step 1: Open Your GitHub Repository

1. **Open your browser** (Chrome, Firefox, Safari, etc.)
2. **Go to:** `https://github.com/Onealgorithm1/MY_AI_AGENT`
3. **Make sure you're logged in** to GitHub

---

### Step 2: Navigate to Secrets Settings

1. **Click** the **"Settings"** tab (top of the page, right side)
   - If you don't see Settings, you might not be logged in

2. **Look at the left sidebar**

3. **Click** "Secrets and variables"

4. **Click** "Actions" (it's a sub-menu under Secrets and variables)

You should now see: "Actions secrets and variables"

---

### Step 3: Add Secret #1 - AWS_EC2_HOST

This tells GitHub where your server is located.

1. **Click** the green button: **"New repository secret"**

2. **In the "Name" field, type exactly:**
   ```
   AWS_EC2_HOST
   ```
   (Must be EXACTLY this, all caps, with underscores)

3. **In the "Secret" field (big box), type:**
   ```
   3.144.201.118
   ```
   (This is your server's IP address)

4. **Click** the green **"Add secret"** button

✅ You should now see: `AWS_EC2_HOST` in your secrets list

---

### Step 4: Add Secret #2 - AWS_EC2_USER

This tells GitHub what username to use when connecting to your server.

1. **Click** "New repository secret" again

2. **Name field:**
   ```
   AWS_EC2_USER
   ```

3. **Secret field:**
   ```
   ubuntu
   ```
   (This is the default user on Ubuntu servers)

4. **Click "Add secret"**

✅ You should now see: `AWS_EC2_USER` in your secrets list

---

### Step 5: Add Secret #3 - AWS_EC2_SSH_KEY

This is the most important secret - it's the key that allows GitHub to log into your server.

#### Find Your SSH Key File

**On Mac:**
1. Open **Finder**
2. Go to **Downloads** folder
3. Look for file: `myaiagent-key.pem`

**On Windows:**
1. Open **File Explorer**
2. Go to **Downloads** folder (usually `C:\Users\YourName\Downloads`)
3. Look for file: `myaiagent-key.pem`

#### Copy the SSH Key Content

**On Mac:**
1. Open **Terminal** (press Cmd+Space, type "Terminal")
2. Type this command:
   ```bash
   cat ~/Downloads/myaiagent-key.pem
   ```
3. Press Enter
4. **Select ALL the text** that appears (including the -----BEGIN and -----END lines)
5. Press **Cmd+C** to copy

**On Windows:**
1. **Right-click** the `myaiagent-key.pem` file
2. Click **"Open with"** → **"Notepad"**
3. **Select ALL** text (Ctrl+A)
4. **Copy** (Ctrl+C)

#### Add the Secret

1. Back in GitHub, **click** "New repository secret"

2. **Name field:**
   ```
   AWS_EC2_SSH_KEY
   ```

3. **Secret field:**
   - **Paste** the entire content you just copied (Ctrl+V or Cmd+V)
   - It should look like this:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   (many lines of random characters)
   ...
   -----END RSA PRIVATE KEY-----
   ```

4. **Click "Add secret"**

✅ You should now see: `AWS_EC2_SSH_KEY` in your secrets list

---

## ✅ Verification

You should now have **3 secrets** showing in your list:

- ✅ `AWS_EC2_HOST`
- ✅ `AWS_EC2_USER`
- ✅ `AWS_EC2_SSH_KEY`

**Screenshot of what it should look like:**
```
Actions secrets / New secret

Name                    Updated
AWS_EC2_HOST           Updated 1 minute ago
AWS_EC2_USER           Updated 1 minute ago
AWS_EC2_SSH_KEY        Updated 1 minute ago
```

---

## 🎉 You're Done!

GitHub Actions can now automatically deploy to your server!

**Test it by:**
1. Making a small code change
2. Committing and pushing to the `main` branch
3. Going to: https://github.com/Onealgorithm1/MY_AI_AGENT/actions
4. Watching the deployment happen automatically!

---

## 🐛 Troubleshooting

### Can't find the Settings tab?
- Make sure you're logged into GitHub
- Make sure you're on the right repository
- You need to be the owner or have admin access

### Can't find myaiagent-key.pem file?
- Check your email from when you created the EC2 instance
- AWS sent you a download link
- If lost, you'll need to create a new key pair in AWS

### Secret field says "invalid"?
- Make sure you copied the ENTIRE key file
- Including -----BEGIN and -----END lines
- No extra spaces or characters

### Still having issues?
1. Double-check the secret names are EXACTLY correct (caps, underscores)
2. Try deleting and re-adding the secrets
3. Ask for help in team chat

---

## 🔒 Security Notes

- ✅ **Secrets are encrypted** - Only GitHub Actions can see them
- ✅ **Never commit** secrets to git
- ✅ **Don't share** secrets in Slack/email
- ✅ **Rotate keys** every few months for security

Your deployment pipeline is now secure and automated! 🎉
