# Deployment Guide: Azure Virtual Machine

This guide explains how to deploy the "My AI Agent" application to Microsoft Azure using a Virtual Machine (VM). This approach is very similar to using AWS EC2.

## Prerequisites

1.  **Azure Account**: You need an active Azure subscription. [Create one for free](https://azure.microsoft.com/free/).
2.  **SSH Client**: A terminal to connect to your VM (Terminal on Mac/Linux, PowerShell or PuTTY on Windows).

---

## Step 1: Create an Azure Virtual Machine

1.  Log in to the **[Azure Portal](https://portal.azure.com)**.
2.  Search for **"Virtual machines"** in the top search bar and select it.
3.  Click **+ Create** -> **Azure virtual machine**.
4.  **Basics Tab**:
    *   **Subscription**: Select your subscription.
    *   **Resource Group**: Create a new one (e.g., `MyAIAgent-RG`).
    *   **Virtual machine name**: Give it a name (e.g., `myaiagent-vm`).
    *   **Region**: Choose a region close to you (e.g., `East US`).
    *   **Image**: Select **Ubuntu Server 22.04 LTS - x64 Gen2** (or 20.04 LTS).
    *   **Size**: `Standard_B2s` is a good starting point (2 vCPUs, 4GB RAM) for an app with AI processing. `Standard_B1s` is cheaper but might be slow for builds.
    *   **Authentication type**: Select **SSH public key**.
    *   **Username**: Default is `azureuser`. Keep it or change it.
    *   **SSH public key source**: "Generate new key pair" (simplest).
    *   **Public inbound ports**: Select **Allow selected ports**.
    *   **Select inbound ports**: Check **HTTP (80)**, **HTTPS (443)**, and **SSH (22)**.
5.  **Disks Tab**: Standard SSD or Premium SSD is fine.
6.  **Networking Tab**: Ensure a tailored Virtual Network and Public IP are created (usually automatic).
7.  Click **Review + create**.
8.  After validation passes, click **Create**.
9.  **Download private key**: A popup will ask you to download the private key (`.pem` file). **Save this securely!** You need it to log in.

---

## Step 2: Connect to the VM

1.  Open your terminal (PowerShell on Windows).
2.  Navigate to the folder where you saved the `.pem` key.
3.  Change permissions (Linux/Mac only): `chmod 400 myaiagent-vm_key.pem`
4.  Connect via SSH:
    ```bash
    ssh -i path/to/your-key.pem azureuser@<VM_PUBLIC_IP_ADDRESS>
    ```
    *(Replace `<VM_PUBLIC_IP_ADDRESS>` with the IP found on the VM's "Overview" page in Azure Portal).*

---

## Step 3: Clone Code and Deploy

Once logged into the VM:

1.  **Clone your repository**:
    ```bash
    git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
    cd your-repo-name/myaiagent-mvp
    ```
    *(If your repo is private, you will need to generate a Personal Access Token (PAT) on GitHub and use it as the password, or set up SSH keys).*

2.  **Make the script executable**:
    ```bash
    chmod +x deploy-azure.sh
    ```

3.  **Run the deployment script**:
    ```bash
    ./deploy-azure.sh
    ```
    This script will:
    *   Update the system.
    *   Install Node.js, PostgreSQL, Nginx, and PM2.
    *   Setup the local database.
    *   Install dependencies and build the frontend.
    *   Start the backend and configure Nginx.

---

## Step 4: Final Configuration

1.  **Edit the Environment Variables**:
    The script creates a default `.env` file. You **must** edit it to add your AI API keys.
    ```bash
    nano backend/.env
    ```
    *   Update `OPENAI_API_KEY`.
    *   Update `GOOGLE_APPLICATION_CREDENTIALS` (if using Google Cloud features).
    *   Change the DB password if you modified it in the script.
    *   Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit.

2.  **Restart the Backend**:
    Apply the new environment variables:
    ```bash
    pm2 restart myaiagent-backend
    ```

3.  **Access your App**:
    Open your browser and enter: `http://<VM_PUBLIC_IP_ADDRESS>`

---

## Troubleshooting

*   **Site not reaching?**
    *   Check Azure **Networking** settings for the VM. Ensure an "Inbound security rule" exists for Port 80 (HTTP) with Action=Allow.
*   **502 Bad Gateway?**
    *   Backend might be down. Check logs: `pm2 logs myaiagent-backend`
*   **Database connection error?**
    *   Ensure PostgreSQL is running: `sudo systemctl status postgresql`
    *   Check `.env` `DATABASE_URL`.
