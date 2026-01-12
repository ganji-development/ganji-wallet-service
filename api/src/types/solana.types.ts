import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface SolanaBalanceResponse {
  address: string;
  balance: number; // in SOL
  lamports: number;
}

export interface SolanaTransferRequest {
  toAddress: string;
  amount: number; // in SOL
}

export interface SolanaTransferResponse {
  signature: string;
  from: string;
  to: string;
  amount: number;
  slot: number;
}

export interface CreateLicenseRequest {
  recipientAddress?: string; // Add this if needed by routes
  softwareId?: number;
  durationSeconds?: number;
  name: string;
  symbol: string;
  uri: string;
}

export interface CreateLicenseResponse {
  mintAddress: string;
  signature: string;
}

export interface RevokeLicenseRequest {
  mintAddress: string;
}

export interface RevokeLicenseResponse {
  signature: string;
  status: "revoked";
}

export interface LicenseAccount {
  owner: PublicKey;
  authority: PublicKey;
  softwareId: BN;
  purchaseTimestamp: BN;
  expirationTimestamp: BN;
  isActive: boolean;
  bump: number;
}
