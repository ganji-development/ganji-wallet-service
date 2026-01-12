# Ganji Wallet Service

A unified cryptocurrency wallet service providing signing and forwarding capabilities for **Solana** and **Litecoin** networks. Designed as a secure backend for the Ganji ecosystem, it manages master wallets, handles gasless transactions, and issues on-chain licenses.

## 🚀 Features

- **Solana Integration:**
  - Transfer SOL
  - Issue & Renew Software Licenses (via Anchor Program)
  - Mint/Send SPL Tokens
  - Dual Network Support (Devnet/Mainnet)
- **Litecoin Integration:**
  - Send LTC
  - Register Asset Hashes (OP_RETURN)
  - Dual Network Support (Testnet/Mainnet)
- **Security:**
  - API Key Authentication
  - IP Whitelisting
  - Secure Master Wallet Management
- **Architecture:**
  - built with Express.js & TypeScript
  - Modular Service/Controller pattern
  - Comprehensive logging (Winston)

## 📦 Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ganjidevelopment/ganji-wallet-service.git
    cd ganji-wallet-service
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    # or
    npm install
    ```

3.  **Configure Environment:**

    - Copy `.env.example` to `.env` in the `api/` directory.
    - Fill in your RPC URLs, API Keys, and Wallet paths.
    - **Important:** You must place your wallet keypairs in the `secrets/` directory as defined in your `.env`.

4.  **Run Locally:**
    ```bash
    cd api
    npm run dev
    ```

## 🔑 Configuration

The service requires distinct configurations for **Mainnet** and **Testnet** environments. Ensure your `.env` includes:

```env
# Solana
SOLANA_TESTNET_RPC_URL=...
SOLANA_MAINNET_RPC_URL=...

# Litecoin
LITECOIN_TESTNET_RPC_URL=...
LITECOIN_MAINNET_RPC_URL=...
```

See [Deployment Guide](docs/DEPLOYMENT.md) for full server setup details.

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [**API Reference**](docs/API.md): Full endpoint details, request/response formats.
- [**Deployment Guide**](docs/DEPLOYMENT.md): Instructions for VPS deployment (Nginx, PM2/Systemd).
- [**Architecture**](docs/ARCHITECTURE.md): System design and service interactions.

## 🧪 Testing

Run the test suite:

```bash
cd api
npm test
```

## 📄 License

Proprietary software for Ganji Development.
