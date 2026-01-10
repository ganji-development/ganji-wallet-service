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
