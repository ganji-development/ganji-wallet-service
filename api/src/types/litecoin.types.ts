export interface LitecoinBalanceResponse {
  address: string;
  balance: number; // in LTC
  unconfirmedBalance?: number;
}

export interface LitecoinTransferRequest {
  destinationAddress: string;
  amount: number; // in LTC
}

export interface LitecoinTransferResponse {
  txId: string;
  amount: number;
  fee: number;
}

export interface RegisterAssetRequest {
  data: string; // The data to embed in OP_RETURN
}

export interface RegisterAssetResponse {
  txId: string;
  assetId: string; // Usually same as txId or specific index
}

export interface VerifyAssetResponse {
  valid: boolean;
  timestamp: string;
  data: string;
}
