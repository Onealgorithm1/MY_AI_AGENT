# 🎓 My AI Agent - Beginner's Guide 
**(For Freshers & New Joiners)**

Welcome to the **My AI Agent** project! 👋 

This guide is written specifically for someone who is new to the team or new to this tech stack. We'll walk you through everything step-by-step, from "I have nothing installed" to "I have the app running on my laptop".

---

## 🧐 What is this project?

**My AI Agent** is a web application where users can chat with an AI (like ChatGPT), but with extra superpowers:
1.  **Voice Chat**: You can talk to it like a real person.
2.  **Memory**: It remembers facts about you (e.g., "You like python scripting").
3.  **Company Intelligence**: It knows about Government Contracts (SAM.gov) and can help businesses find work.

### The Tech Stack (What we use)
*   **Frontend**: React (The website you see)
*   **Backend**: Node.js & Express (The brain/server)
*   **Database**: PostgreSQL (Where we save data)
*   **AI**: OpenAI (GPT-4)

---

## 🛠️ Prerequisites (Install these first!)

Before you do anything, make sure you have these installed on your computer:

1.  **VS Code** (Code Editor): [Download Here](https://code.visualstudio.com/)
2.  **Node.js** (Version 20): [Download Here](https://nodejs.org/) (Choose "LTS")
3.  **Git** (Version Control): [Download Here](https://git-scm.com/downloads)
4.  **PostgreSQL** (Database): [Download Here](https://www.postgresql.org/download/)
    *   *Tip during install:* It will ask for a password for the `postgres` user. Set it to something simple like `root` or `password` for your local machine and **REMEMBER IT**.

---

## 🚀 Step-by-Step Setup Guide

### 1. Get the Code
Open your terminal (Command Prompt or PowerShell) and run:

```bash
# 1. Clone the repository (Download code)
git clone https://github.com/Onealgorithm1/MY_AI_AGENT.git

# 2. Go into the project folder
cd MY_AI_AGENT/myaiagent-mvp
```

### 2. Setup the Database
We need to create a place for the app to store data.
1.  Open **pgAdmin 4** (it comes with PostgreSQL) or use the terminal.
2.  Create a new database named `myaiagent`.
    *   *SQL Command:* `CREATE DATABASE myaiagent;`

### 3. Setup the Backend (The Server)
This is the API that handles logic and data.

```bash
# 1. Go to backend folder
cd backend

# 2. Install dependencies (libraries we use)
npm install

# 3. Configure Environment Variables
# Copy the example file to a real .env file
cp .env.example .env

# 4. Open the new .env file in VS Code
# Make sure DATABASE_URL matches your password!
# Example: postgresql://postgres:YOUR_PASSWORD@localhost:5432/myaiagent

# 5. Initialize the Database (Create tables)
npm run migrate

# 6. Seed Data (Add a default admin user)
npm run seed

# 7. Start the Server!
npm run start
```

🎉 **Success**: You should see "Server running on port 3000".
*(Keep this terminal open!)*

### 4. Setup the Frontend (The Website)
Open a **NEW** terminal window (Ctrl+Shift+` in VS Code) and run:

```bash
# 1. Go to frontend folder
cd ../frontend  # (Adjust path if needed, make sure you are in myaiagent-mvp/frontend)

# 2. Install dependencies
npm install

# 3. Start the website
npm run dev
```

🎉 **Success**: You will see a link like `http://localhost:5173`. Click it!

---

## 🎮 How to Login

Once the website is open:
*   **Email**: `admin@myaiagent.com`
*   **Password**: `admin123`

---

## ⚠️ Common "Fresher" Errors & Fixes

**1. "port 3000 is already in use"**
*   **Problem**: You have another server running (maybe an old terminal).
*   **Fix**: Close all other terminals. Or run `npx kill-port 3000`.

**2. "password authentication failed for user postgres"**
*   **Problem**: The password in your `backend/.env` file is wrong.
*   **Fix**: Update `DATABASE_URL` in `.env` with the password you set during PostgreSQL installation.

**3. "relation does not exist"**
*   **Problem**: The database tables weren't created.
*   **Fix**: Make sure you ran `npm run migrate` in the backend folder.

**4. "fetch failed" / "Network Error"**
*   **Problem**: The frontend can't talk to the backend.
*   **Fix**: Make sure the **Backend** terminal is still running and shows "Server running on port 3000".

---

## 🧠 Project Structure (Where is everything?)

*   `backend/src/routes/` -> **API Endpoints** (The URL paths like /login, /profile)
*   `backend/src/services/` -> **Business Logic** (Where the heavy lifting happens)
*   `frontend/src/pages/` -> **Web Pages** (React components for each page)
*   `frontend/src/components/` -> **Reusable UI** (Buttons, Headers, Cards)

---

## 🤝 Need Help?

1.  Check the error message in the Terminal.
2.  Google the error code.
3.  Ask a senior dev (but try to fix it yourself first!).

**Happy Coding! 🚀**
