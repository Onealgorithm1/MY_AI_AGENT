# 🚀 Deployment Guide for Freshers
**(How to put the website on the internet)**

So, you've written some code and it works on your laptop. Now, how do you get it onto the real server so everyone can see it? 🤔

This guide explains our **Automated Deployment** process in simple terms.

---

## 😲 How it Works (The "Magic")

We don't manually copy files to the server anymore. That's old school.
Instead, we use **GitHub Actions**.

1.  **You** push your code to GitHub.
2.  **GitHub** sees the new code and says "Hey, let's deploy this!".
3.  **GitHub** logs into our server (EC2) automatically.
4.  It updates the code, builds the website, and restarts the server.

**You don't need to touch the server!** Just push your code.

---

## 🔑 One-Time Setup (Do this once)

Before the magic can happen, GitHub needs the "Keys" to our server. We store these securely in **GitHub Secrets**.

### 1. Go to GitHub
Navigate to your repository page -> **Settings** -> **Secrets and variables** -> **Actions**.

### 2. Add these "Repository Secrets"
Click "New repository secret" and add these exactly:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `EC2_HOST` | `12.34.56.78` | The IP address of our server |
| `EC2_USERNAME` | `ubuntu` | The username we use to login (usually ubuntu) |
| `EC2_SSH_KEY` | `-----BEGIN RSA...` | The private key content (from your `.pem` file) |

*(Ask your lead dev for these values!)*

---

## 🚢 How to Deploy (Day-to-Day)

Ready to update the website? Here is all you have to do:

### 1. Switch to the Development Branch
We deploy everything from the `development` branch.
```bash
git checkout development
```

### 2. Save your changes
```bash
git add .
git commit -m "Fixed the login button"
```

### 3. Push to GitHub
```bash
git push origin development
```

**That's it!** 😲
Now wait about 2-3 minutes. GitHub is doing the work for you.

---

## ✅ How do I know if it worked?

1.  Go to your GitHub Repository page.
2.  Click the **"Actions"** tab at the top.
3.  You will see your commit message (e.g., "Fixed the login button").
    *   🟡 **Yellow Circle**: It's working... (Getting coffee...)
    *   🟢 **Green Checkmark**: Success! The live site is updated.
    *   🔴 **Red X**: Something broke. Click it to see why.

---

## 🚑 Help! It failed (Red X)

If the deployment failed, click on the Red X in the Actions tab to see the "Log".

**Common Reasons:**
1.  **"SSH: handshake failed"**: The `EC2_SSH_KEY` secret is wrong or expired.
2.  **"Directory not found"**: The server doesn't have the folder structure we expect.
3.  **"npm install failed"**: You added a bad package in `package.json`.

**What to do:**
1.  Read the error message.
2.  Fix the code on your laptop.
3.  Push again!

---

## 🧠 Summary for your Brain

*   **Setup**: Add Secrets to GitHub (One time).
*   **Deploy**: `git push origin development`.
*   **Check**: Look for the Green Checkmark in GitHub Actions.

Happy Deploying! 🚀
