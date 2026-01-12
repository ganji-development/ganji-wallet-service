# Architecture: Ganji Wallet Service

This document outlines the architectural design of the Ganji Wallet Service (CNode). The service acts as a secure cryptographic signing and transaction forwarding middleware for the Ganji ecosystem, abstracting blockchain complexities from client applications.

## 🏗️ System Overview

The service is built as a modular Node.js/TypeScript application using Express. It is designed to be stateless (except for local caching provided by the database, if attached, though currently purely API-driven).

### Key Components

1.  **Routes Layer (`routes/`)**:

    - REST API endpoints for Solana and Litecoin.
    - Handles input validation (Zod) and authentication (Middleware).
    - Parses the `useTestnet` parameter to direct traffic.

2.  **Service Layer (`services/`)**:

    - **SolanaService:**
      - Manages connection pools for Mainnet and Devnet.
      - Loads and secures two distinct Master Wallets (Mainnet/Devnet).
      - Interacts with the `solana-license-program` via Anchor.
    - **LitecoinService:**
      - Acts as a wrapper around a Litecoin Core RPC node.
      - Manages dual configurations for Mainnet and Testnet RPCs.
      - Handles OP_RETURN data encoding for asset registration.

3.  **Authentication & Security**:
    - `auth.middleware.ts`: Validates `X-API-Key` against stored secrets.
    - IP Whitelisting: Restricts access to known Ganji servers (e.g., Application Node).
    - **Master Wallets**: Private keys are stored on the filesystem (`secrets/`) and never exposed via API. They are loaded into memory at startup.

## 🌐 Dual Network Support

A core feature is the ability to route requests to either Mainnet or Testnet dynamically on a per-request basis.

### Solana Implementation

- **Connection Pools**: The service instantiates two `web3.Connection` objects at startup.
- **Wallet Switching**: Two `Keypair` objects are loaded. `getKeypair(useTestnet)` selects the signer.
- **Program Context**: Two `Program` instances (Anchor) are initialized to allow interaction with potentially different Program IDs on different networks.

### Litecoin Implementation

- **RPC Routing**: The service holds two configuration objects (URL/Auth).
- **Dynamic Calls**: The `rpcCall` method accepts a `useTestnet` flag and selects the appropriate RPC endpoint (e.g., port 19332 vs 9332).

## 💾 Data Flow

### 1. License Creation (Solana)

1.  Client sends `POST /api/v1/solana/license/create` with `recipient` and `useTestnet: true`.
2.  **Validator**: Checks address format.
3.  **SolanaService**:
    - Derives License PDA from Program ID (Devnet).
    - Constructs `issue_license` instruction.
    - Signs with **Devnet Master Wallet**.
4.  **Blockchain**: Transaction submitted to Solana Devnet.
5.  **Response**: Returns signature and PDA address.

### 2. Asset Registration (Litecoin)

1.  Client sends `POST /api/v1/litecoin/asset/register` with `hash` and `useTestnet: false`.
2.  **LitecoinService**:
    - Selects **Mainnet** RPC config.
    - Calls `listunspent` to find UTXOs.
    - Constructs raw transaction with OP_RETURN output containing the hash.
    - Signs and Broadcasts via RPC.
3.  **Response**: Returns TXID.

## 🔐 Deployment Architecture

- **VPS**: Debian-based instance.
- **Process Manager**: PM2 or Systemd ensures high availability.
- **Reverse Proxy**: Nginx handles SSL termination (Let's Encrypt) and proxies port 80/443 to the Node app on port 3000.
- **Firewall**: UFW restricts incoming ports to just 80/443/SSH.

## 🔄 Future Scalability

- **Redis Caching**: To cache balance checks or license states to reduce simple RPC load.
- **Queueing**: Implement BullMQ/Redis for transaction buffering during high load (handling nonces/sequence order).
- **Webhook Events**: Notify clients when transactions confirm instead of polling.
