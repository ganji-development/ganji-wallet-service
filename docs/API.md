# API Documentation: ganji-wallet-service

> **Version:** 1.0.0
> **Base URL:** `https://cnode.ganjidevelopment.com` > **Authentication:** API Key (X-API-Key header)

---

## Overview

The ganji-wallet-service API provides cryptocurrency transaction signing and forwarding capabilities for Solana and Litecoin networks. All endpoints (except `/health`) require authentication via API key and IP whitelisting.

---

## Authentication

### API Key

All authenticated requests must include the `X-API-Key` header:

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/solana/balance \
  -H "X-API-Key: your-api-key-here"
```

### IP Whitelisting

Requests must originate from a whitelisted IP address. Contact the administrator to add your IP to the whitelist.

### Error Responses

| Status | Error Code                     | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| 401    | `AUTH_MISSING_KEY`             | X-API-Key header not provided |
| 401    | `AUTH_INVALID_KEY`             | Invalid API key               |
| 403    | `FORBIDDEN_IP_NOT_WHITELISTED` | IP address not in whitelist   |

---

## Standard Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-01-10T07:10:00.000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_INVALID_ADDRESS",
    "message": "The provided address is invalid",
    "details": {
      "field": "to",
      "received": "invalid-address"
    }
  },
  "meta": {
    "timestamp": "2026-01-10T07:10:00.000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Health Check

### GET /health

Check service health status. **No authentication required.**

#### Response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-10T07:10:00.000Z",
    "uptime": 3600,
    "version": "1.0.0"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-01-10T07:10:00.000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Solana Endpoints

### GET /api/v1/solana/balance

Get the SOL balance of the service wallet.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/solana/balance \
  -H "X-API-Key: your-api-key"
```

#### Response

```json
{
  "success": true,
  "data": {
    "lamports": 1000000000,
    "sol": 1.0,
    "pubkey": "ABC123..."
  },
  "error": null,
  "meta": { ... }
}
```

---

### POST /api/v1/solana/transfer

Transfer SOL from the service wallet to a recipient address.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/solana/transfer \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "RecipientPublicKeyHere...",
    "amount": 0.1,
    "useTestnet": true
  }'
```

#### Request Body

| Field        | Type    | Required | Description                          |
| ------------ | ------- | -------- | ------------------------------------ |
| `to`         | string  | Yes      | Recipient Solana public key (base58) |
| `amount`     | number  | Yes      | Amount of SOL to transfer            |
| `useTestnet` | boolean | No       | Use Testnet/Devnet (default: false)  |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "5abc123...",
    "from": "ServiceWalletPubkey...",
    "to": "RecipientPubkey...",
    "amount": 0.1,
    "status": "confirmed"
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                         | Description                  |
| ---------------------------- | ---------------------------- |
| `VALIDATION_INVALID_ADDRESS` | Invalid Solana address       |
| `VALIDATION_INVALID_AMOUNT`  | Amount must be positive      |
| `CHAIN_INSUFFICIENT_FUNDS`   | Not enough SOL in wallet     |
| `CHAIN_TRANSACTION_FAILED`   | Transaction broadcast failed |

---

### GET /api/v1/solana/verify/:txid

Verify the status of a Solana transaction.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/solana/verify/5abc123... \
  -H "X-API-Key: your-api-key"
```

#### Parameters

| Parameter | Type   | Description                    |
| --------- | ------ | ------------------------------ |
| `txid`    | string | Transaction signature (base58) |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "5abc123...",
    "slot": 123456789,
    "status": "confirmed",
    "fee": 5000,
    "confirmations": 32
  },
  "error": null,
  "meta": { ... }
}
```

#### Transaction Status Values

| Status      | Description                             |
| ----------- | --------------------------------------- |
| `confirmed` | Transaction is confirmed                |
| `finalized` | Transaction is finalized (irreversible) |
| `failed`    | Transaction failed                      |
| `not_found` | Transaction not found                   |

---

### POST /api/v1/solana/sign-and-send

Sign and broadcast a raw Solana transaction.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/solana/sign-and-send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": "base64-encoded-transaction"
  }'
```

#### Request Body

| Field         | Type    | Required | Description                           |
| ------------- | ------- | -------- | ------------------------------------- |
| `transaction` | string  | Yes      | Base64-encoded serialized transaction |
| `useTestnet`  | boolean | No       | Use Testnet/Devnet (default: false)   |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "5abc123...",
    "status": "confirmed"
  },
  "error": null,
  "meta": { ... }
}
```

---

### POST /api/v1/solana/license/create

Create a new license token (mint SPL token) for a recipient.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/solana/license/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "RecipientPublicKey...",
    "licenseId": "license-uuid-here",
    "metadata": {
      "name": "Ganji Music License",
      "symbol": "GML",
      "uri": "https://arweave.net/metadata-uri",
      "sellerFeeBasisPoints": 500
    }
  }'
```

#### Request Body

| Field                           | Type    | Required | Description                              |
| ------------------------------- | ------- | -------- | ---------------------------------------- |
| `recipient`                     | string  | Yes      | Recipient Solana public key (base58)     |
| `licenseId`                     | string  | Yes      | Unique license identifier (UUID)         |
| `metadata.name`                 | string  | Yes      | Token name                               |
| `metadata.symbol`               | string  | Yes      | Token symbol (max 10 chars)              |
| `metadata.uri`                  | string  | Yes      | Metadata URI (Arweave/IPFS)              |
| `metadata.sellerFeeBasisPoints` | number  | No       | Royalty fee in basis points (default: 0) |
| `useTestnet`                    | boolean | No       | Use Testnet/Devnet (default: false)      |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "5abc123...",
    "tokenMint": "MintAddress...",
    "recipient": "RecipientPublicKey...",
    "licenseId": "license-uuid-here",
    "status": "confirmed"
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                          | Description                         |
| ----------------------------- | ----------------------------------- |
| `VALIDATION_INVALID_ADDRESS`  | Invalid recipient address           |
| `VALIDATION_INVALID_METADATA` | Invalid metadata fields             |
| `CHAIN_INSUFFICIENT_FUNDS`    | Not enough SOL for transaction fees |
| `CHAIN_TRANSACTION_FAILED`    | Token minting failed                |

---

### POST /api/v1/solana/license/revoke

Revoke a license token (burn SPL token) from a holder.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/solana/license/revoke \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenMint": "MintAddress...",
    "holder": "HolderPublicKey...",
    "reason": "License expired"
  }'
```

#### Request Body

| Field       | Type   | Required | Description                     |
| ----------- | ------ | -------- | ------------------------------- |
| `tokenMint` | string | Yes      | Token mint address (base58)     |
| `holder`    | string | Yes      | Current token holder public key |
| `reason`    | string | Yes      | Reason for revocation           |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "5abc123...",
    "tokenMint": "MintAddress...",
    "holder": "HolderPublicKey...",
    "burned": true,
    "status": "confirmed"
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                         | Description                          |
| ---------------------------- | ------------------------------------ |
| `VALIDATION_INVALID_ADDRESS` | Invalid token mint or holder address |
| `CHAIN_TOKEN_NOT_FOUND`      | Token account not found              |
| `CHAIN_UNAUTHORIZED`         | Not authorized to burn this token    |
| `CHAIN_TRANSACTION_FAILED`   | Token burning failed                 |

---

## Litecoin Endpoints

### GET /api/v1/litecoin/balance

Get the LTC balance of the service wallet.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/litecoin/balance \
  -H "X-API-Key: your-api-key"
```

#### Response

```json
{
  "success": true,
  "data": {
    "balance": 10.5,
    "unconfirmed": 0.0,
    "total": 10.5
  },
  "error": null,
  "meta": { ... }
}
```

---

### POST /api/v1/litecoin/send

Send LTC from the service wallet to a recipient address.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/litecoin/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "LTC_ADDRESS_HERE",
    "amount": 0.5
  }'
```

#### Request Body

| Field        | Type    | Required | Description                           |
| ------------ | ------- | -------- | ------------------------------------- |
| `to`         | string  | Yes      | Recipient Litecoin address            |
| `amount`     | number  | Yes      | Amount of LTC to send                 |
| `useTestnet` | boolean | No       | Use Litecoin Testnet (default: false) |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "abc123...",
    "to": "LTC_ADDRESS_HERE",
    "amount": 0.5,
    "status": "sent"
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                         | Description                  |
| ---------------------------- | ---------------------------- |
| `VALIDATION_INVALID_ADDRESS` | Invalid Litecoin address     |
| `VALIDATION_INVALID_AMOUNT`  | Amount must be positive      |
| `CHAIN_INSUFFICIENT_FUNDS`   | Not enough LTC in wallet     |
| `CHAIN_TRANSACTION_FAILED`   | Transaction broadcast failed |

---

### GET /api/v1/litecoin/verify/:txid

Verify the status of a Litecoin transaction.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/litecoin/verify/abc123... \
  -H "X-API-Key: your-api-key"
```

#### Parameters

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| `txid`    | string | Transaction ID |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "abc123...",
    "confirmations": 6,
    "verified": true,
    "blockhash": "000000...",
    "blocktime": 1704844800
  },
  "error": null,
  "meta": { ... }
}
```

---

### GET /api/v1/litecoin/network

Get Litecoin network information.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/litecoin/network \
  -H "X-API-Key: your-api-key"
```

#### Response

```json
{
  "success": true,
  "data": {
    "blocks": 2500000,
    "difficulty": 12345678.9,
    "chain": "main",
    "bestblockhash": "000000..."
  },
  "error": null,
  "meta": { ... }
}
```

---

### POST /api/v1/litecoin/asset/register

Register an asset hash on the Litecoin blockchain using OP_RETURN.

#### Request

```bash
curl -X POST https://cnode.ganjidevelopment.com/api/v1/litecoin/asset/register \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "asset-uuid-here",
    "hash": "SHA256-hash-of-asset-content",
    "metadata": {
      "type": "music",
      "title": "Track Title",
      "artist": "Artist Name"
    }'
```

#### Request Body

| Field             | Type    | Required | Description                                 |
| ----------------- | ------- | -------- | ------------------------------------------- |
| `assetId`         | string  | Yes      | Unique asset identifier (UUID)              |
| `hash`            | string  | Yes      | SHA256 hash of asset content (64 chars hex) |
| `metadata.type`   | string  | Yes      | Asset type (music, artwork, license)        |
| `metadata.title`  | string  | No       | Asset title                                 |
| `metadata.title`  | string  | No       | Asset title                                 |
| `metadata.artist` | string  | No       | Artist/creator name                         |
| `useTestnet`      | boolean | No       | Use Litecoin Testnet (default: false)       |

#### Response

```json
{
  "success": true,
  "data": {
    "txid": "abc123...",
    "assetId": "asset-uuid-here",
    "hash": "SHA256-hash...",
    "opReturn": "GANJI:asset-uuid:SHA256-hash",
    "confirmations": 0,
    "status": "broadcast"
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                          | Description                          |
| ----------------------------- | ------------------------------------ |
| `VALIDATION_INVALID_HASH`     | Hash must be 64 character hex string |
| `VALIDATION_INVALID_ASSET_ID` | Invalid asset ID format              |
| `CHAIN_INSUFFICIENT_FUNDS`    | Not enough LTC for transaction       |
| `CHAIN_TRANSACTION_FAILED`    | OP_RETURN transaction failed         |

---

### GET /api/v1/litecoin/asset/verify/:assetId

Verify an asset registration on the Litecoin blockchain.

#### Request

```bash
curl -X GET https://cnode.ganjidevelopment.com/api/v1/litecoin/asset/verify/asset-uuid-here \
  -H "X-API-Key: your-api-key"
```

#### Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| `assetId` | string | Asset identifier to verify |

#### Response

```json
{
  "success": true,
  "data": {
    "assetId": "asset-uuid-here",
    "verified": true,
    "txid": "abc123...",
    "hash": "SHA256-hash...",
    "blockHeight": 2500000,
    "blockTime": 1704844800,
    "confirmations": 6
  },
  "error": null,
  "meta": { ... }
}
```

#### Errors

| Code                          | Description                           |
| ----------------------------- | ------------------------------------- |
| `VALIDATION_INVALID_ASSET_ID` | Invalid asset ID format               |
| `CHAIN_ASSET_NOT_FOUND`       | Asset registration not found on chain |

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

| Limit               | Value |
| ------------------- | ----- |
| Requests per minute | 60    |
| Burst               | 10    |

When rate limited, the API returns:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  },
  "meta": { ... }
}
```

---

## Error Codes Reference

### Validation Errors (400)

| Code                         | Description                |
| ---------------------------- | -------------------------- |
| `VALIDATION_REQUIRED_FIELD`  | Required field is missing  |
| `VALIDATION_INVALID_ADDRESS` | Invalid blockchain address |
| `VALIDATION_INVALID_AMOUNT`  | Invalid amount value       |
| `VALIDATION_INVALID_TXID`    | Invalid transaction ID     |

### Authentication Errors (401)

| Code               | Description            |
| ------------------ | ---------------------- |
| `AUTH_MISSING_KEY` | API key header missing |
| `AUTH_INVALID_KEY` | API key is invalid     |

### Authorization Errors (403)

| Code                           | Description               |
| ------------------------------ | ------------------------- |
| `FORBIDDEN_IP_NOT_WHITELISTED` | Client IP not whitelisted |

### Rate Limit Errors (429)

| Code                  | Description       |
| --------------------- | ----------------- |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

### Blockchain Errors (500/503)

| Code                        | Description                     |
| --------------------------- | ------------------------------- |
| `CHAIN_TRANSACTION_FAILED`  | Transaction failed to broadcast |
| `CHAIN_INSUFFICIENT_FUNDS`  | Insufficient wallet balance     |
| `CHAIN_NETWORK_UNAVAILABLE` | Blockchain network unreachable  |

### Internal Errors (500)

| Code                    | Description             |
| ----------------------- | ----------------------- |
| `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## SDKs & Examples

### JavaScript/TypeScript

```typescript
const response = await fetch(
  "https://cnode.ganjidevelopment.com/api/v1/solana/transfer",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.CRYPTO_API_KEY,
    },
    body: JSON.stringify({
      to: "RecipientAddress...",
      amount: 0.1,
    }),
  }
);

const result = await response.json();
if (result.success) {
  console.log("Transaction ID:", result.data.txid);
} else {
  console.error("Error:", result.error.message);
}
```

### Python

```python
import requests

response = requests.post(
    'https://cnode.ganjidevelopment.com/api/v1/solana/transfer',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key',
    },
    json={
        'to': 'RecipientAddress...',
        'amount': 0.1,
    }
)

result = response.json()
if result['success']:
    print(f"Transaction ID: {result['data']['txid']}")
else:
    print(f"Error: {result['error']['message']}")
```

---

_Last Updated: 2026-01-10_
_API Version: 1.0.0_
