# Deployment Guide: Ganji Wallet Service

This guide covers the deployment of the Ganji Wallet Service to a Linux VPS (Debian/Ubuntu).

---

## 1. Prerequisites

- A VPS instance (Debian 11/12 or Ubuntu 20.04+) with root access.
- A domain name pointing to your VPS IP (e.g., `cnode.ganjidevelopment.com`).
- SSH Key-based authentication configured.

## 2. Server Provisioning

### Initial Setup & Security

Login to your VPS and update packages:

```bash
apt update && apt upgrade -y
apt install curl git ufw -y
```

### Configure Firewall (UFW)

Allow SSH, HTTP, and HTTPS:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Install Node.js

We recommend using Node v18+ via NVM or NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
```

## 3. Application Deployment

### Clone Repository

```bash
mkdir -p /var/www/ganji-wallet-service
cd /var/www/ganji-wallet-service
# Use git clone or scp your local files
git clone <repo_url> .
```

### Install Dependencies & Build

```bash
cd api
pnpm install
pnpm build
```

### Environment Configuration

1.  Create the `.env` file:
    ```bash
    cp .env.example .env
    nano .env
    ```
2.  Paste your **Production** values (Mainnet RPCs, API Keys).

### Secrets Management

1.  Create the secrets directory:
    ```bash
    mkdir -p secrets
    chmod 700 secrets
    ```
2.  Upload your Master Keypairs:
    - `secrets/master-keypair-mainnet.json`
    - `secrets/master-keypair-testnet.json`

## 4. Process Management (PM2)

Use PM2 to run the application in the background using the provided configuration file.

```bash
cd api
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

To view logs:

```bash
pm2 logs ganji-wallet-api
```

## 5. Nginx Reverse Proxy & SSL

### Install Nginx

```bash
apt install nginx certbot python3-certbot-nginx -y
```

### Configure Virtual Host

Create `/etc/nginx/sites-available/ganji-wallet`:

```nginx
server {
    server_name cnode.ganjidevelopment.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/ganji-wallet /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Setup SSL (Let's Encrypt)

Run Certbot to automatically configure HTTPS:

```bash
certbot --nginx -d cnode.ganjidevelopment.com
```

## 6. Verification

Test the health endpoint from your local machine:

```bash
curl https://cnode.ganjidevelopment.com/health
```

## 7. Maintenance

- **Logs:** `pm2 logs ganji-wallet`
- **Restart:** `pm2 restart ganji-wallet`
- **Update:**
  ```bash
  git pull
  pnpm install
  pnpm build
  pm2 restart ganji-wallet
  ```
