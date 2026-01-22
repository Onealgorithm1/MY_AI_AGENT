# Infra Request: New Azure VM for AI Agent App

Please provision a new Azure Virtual Machine with the following specifications:

## 1. Virtual Machine Specs
*   **OS Logic**: Linux (Ubuntu 22.04 LTS or 20.04 LTS)
*   **Region**: [Insert Preferred Region, e.g., East US]
*   **Size**: `Standard_B2s` (2 vCPUs, 4 GiB RAM) or higher
    *   *Note: Needs at least 4GB RAM for building frontend and running AI processes.*
*   **Disk**: Standard SSD or Premium SSD (30GB+)

## 2. Networking & Security
*   **Public IP**: Required (Static preferred but dynamic acceptable for dev)
*   **Inbound Ports (NSG Rules)**:
    *   `22` (SSH) - Restricted to VPN or Org IPs if possible
    *   `80` (HTTP) - Open to Internet (`0.0.0.0/0`)
    *   `443` (HTTPS) - Open to Internet (`0.0.0.0/0`)

## 3. Access
*   **Username**: `azureuser` (or standard org user)
*   **Authentication**: SSH Key
    *   Please provide the `.pem` private key securely after creation.
    *   *OR* add the attached public key to `~/.ssh/authorized_keys`.

## 4. Post-Provisioning
No manual software installation required. We will run an automated script (`deploy-azure.sh`) to install Node.js, Nginx, and Postgres.
