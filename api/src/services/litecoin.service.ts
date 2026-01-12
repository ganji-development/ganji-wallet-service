import { config } from "../config/index.js";
import { logger } from "./logger.service.js";
import {
  LitecoinBalanceResponse,
  LitecoinTransferResponse,
  RegisterAssetResponse,
  VerifyAssetResponse,
} from "../types/litecoin.types.js";

interface RpcResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string;
}

interface UnspentOutput {
  txid: string;
  vout: number;
  address: string;
  amount: number;
  scriptPubKey: string;
  confirmations: number;
}

interface RawTransaction {
  txid: string;
  confirmations: number;
  time: number;
  blocktime?: number;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      type: string;
    };
  }>;
}

export class LitecoinService {
  private mainnetConfig: { url: string; auth: string };
  private testnetConfig: { url: string; auth: string };

  constructor() {
    this.mainnetConfig = {
      url: config.litecoin.mainnet.url,
      auth: `Basic ${Buffer.from(
        `${config.litecoin.mainnet.username}:${config.litecoin.mainnet.password}`
      ).toString("base64")}`,
    };

    this.testnetConfig = {
      url: config.litecoin.testnet.url,
      auth: `Basic ${Buffer.from(
        `${config.litecoin.testnet.username}:${config.litecoin.testnet.password}`
      ).toString("base64")}`,
    };
  }

  private getConfig(useTestnet: boolean) {
    return useTestnet ? this.testnetConfig : this.mainnetConfig;
  }

  /**
   * Make a JSON-RPC call to the Litecoin node
   */
  private async rpcCall<T>(
    method: string,
    params: unknown[] = [],
    useTestnet: boolean = false
  ): Promise<T> {
    const { url, auth } = this.getConfig(useTestnet);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: auth,
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        id: `ganji-${Date.now()}`,
        method,
        params,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("RPC request failed", {
        status: response.status,
        body: errorBody,
      });
      throw new Error(
        `RPC request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as RpcResponse<T>;

    if (data.error) {
      throw new Error(
        `RPC error: ${data.error.message} (code: ${data.error.code})`
      );
    }

    return data.result;
  }

  /**
   * Get wallet balance (requires wallet RPC access)
   */
  public async getBalance(
    address: string,
    useTestnet: boolean = false
  ): Promise<LitecoinBalanceResponse> {
    try {
      // Use getreceivedbyaddress for specific address balance
      // Note: This requires the address to be in the wallet
      const balance = await this.rpcCall<number>(
        "getreceivedbyaddress",
        [address, 1],
        useTestnet
      );
      const unconfirmed = await this.rpcCall<number>(
        "getreceivedbyaddress",
        [address, 0],
        useTestnet
      );

      return {
        address,
        balance,
        unconfirmedBalance: unconfirmed - balance,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error fetching Litecoin balance", {
        address,
        error: errorMessage,
      });
      throw new Error(`Failed to get balance: ${errorMessage}`);
    }
  }

  /**
   * Generate a new wallet address
   */
  public async createWallet(useTestnet: boolean = false): Promise<{
    address: string;
    privateKey: string;
  }> {
    try {
      const address = await this.rpcCall<string>(
        "getnewaddress",
        ["ganji-wallet"],
        useTestnet
      );
      // Note: dumpprivkey requires wallet to be unlocked
      // In production, you'd manage keys differently
      const privateKey = await this.rpcCall<string>(
        "dumpprivkey",
        [address],
        useTestnet
      );

      return { address, privateKey };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error creating Litecoin wallet", { error: errorMessage });
      throw new Error(`Failed to create wallet: ${errorMessage}`);
    }
  }

  /**
   * Send LTC to an address
   */
  public async sendTransaction(
    destination: string,
    amount: number,
    useTestnet: boolean = false
  ): Promise<LitecoinTransferResponse> {
    try {
      // sendtoaddress returns the txid
      const txId = await this.rpcCall<string>(
        "sendtoaddress",
        [destination, amount],
        useTestnet
      );

      // Get transaction details for fee info
      const txInfo = await this.rpcCall<{ fee: number }>(
        "gettransaction",
        [txId],
        useTestnet
      );

      return {
        txId,
        amount,
        fee: Math.abs(txInfo.fee || 0.0001),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Litecoin send failed", {
        destination,
        amount,
        error: errorMessage,
      });
      throw new Error(`Transaction failed: ${errorMessage}`);
    }
  }

  /**
   * Register an asset by embedding data in an OP_RETURN output
   * @param data - Hex-encoded hash or data to embed (max 80 bytes)
   */
  public async registerAsset(
    data: string,
    useTestnet: boolean = false
  ): Promise<RegisterAssetResponse> {
    try {
      // Validate data length (OP_RETURN limit is 80 bytes = 160 hex chars)
      if (data.length > 160) {
        throw new Error("Data exceeds OP_RETURN limit of 80 bytes");
      }

      // 1. Get unspent outputs to fund the transaction
      const unspent = await this.rpcCall<UnspentOutput[]>(
        "listunspent",
        [1, 9999999],
        useTestnet
      );

      if (unspent.length === 0) {
        throw new Error("No unspent outputs available to fund transaction");
      }

      // Select first UTXO with sufficient balance (need ~0.0001 LTC for fee)
      const utxo = unspent.find((u) => u.amount >= 0.0001);
      if (!utxo) {
        throw new Error("No UTXO with sufficient balance for transaction fee");
      }

      // 2. Create raw transaction
      const inputs = [{ txid: utxo.txid, vout: utxo.vout }];

      // Calculate change (input - fee)
      const fee = 0.0001;
      const changeAmount = parseFloat((utxo.amount - fee).toFixed(8));

      // Outputs: OP_RETURN data + change back to our address
      const outputs: Record<string, number | string> = {
        data: data, // Special "data" key creates OP_RETURN
      };

      if (changeAmount > 0.00001) {
        outputs[utxo.address] = changeAmount;
      }

      const rawTx = await this.rpcCall<string>(
        "createrawtransaction",
        [inputs, outputs],
        useTestnet
      );

      // 3. Sign the transaction
      const signedResult = await this.rpcCall<{
        hex: string;
        complete: boolean;
      }>("signrawtransactionwithwallet", [rawTx], useTestnet);

      if (!signedResult.complete) {
        throw new Error("Transaction signing incomplete");
      }

      // 4. Broadcast the transaction
      const txId = await this.rpcCall<string>(
        "sendrawtransaction",
        [signedResult.hex],
        useTestnet
      );

      logger.info("Asset registered on Litecoin blockchain", {
        txId,
        dataLength: data.length,
      });

      return {
        txId,
        assetId: txId, // For OP_RETURN, the txId IS the asset identifier
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to register asset", { error: errorMessage });
      throw new Error(`Asset registration failed: ${errorMessage}`);
    }
  }

  /**
   * Verify a transaction exists and extract OP_RETURN data
   */
  public async verifyTransaction(
    txId: string,
    _address?: string,
    useTestnet: boolean = false
  ): Promise<boolean> {
    try {
      const tx = await this.rpcCall<RawTransaction>(
        "getrawtransaction",
        [txId, true],
        useTestnet
      );
      return tx.confirmations >= 1;
    } catch {
      return false;
    }
  }

  /**
   * Verify an asset registration and return the embedded data
   */
  public async verifyAsset(
    txId: string,
    useTestnet: boolean = false
  ): Promise<VerifyAssetResponse> {
    try {
      const tx = await this.rpcCall<RawTransaction>(
        "getrawtransaction",
        [txId, true],
        useTestnet
      );

      // Find OP_RETURN output
      const opReturnOutput = tx.vout.find(
        (out) => out.scriptPubKey.type === "nulldata"
      );

      if (!opReturnOutput) {
        throw new Error("No OP_RETURN data found in transaction");
      }

      // Extract data from OP_RETURN script
      // Format: OP_RETURN <data> -> hex starts after "6a" (OP_RETURN) and length byte
      const hex = opReturnOutput.scriptPubKey.hex;
      // Skip OP_RETURN (6a) and the length byte
      const dataHex = hex.slice(4); // Simplified; real parsing would check length byte

      return {
        valid: tx.confirmations >= 1,
        timestamp: new Date((tx.blocktime || tx.time) * 1000).toISOString(),
        data: dataHex,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Asset verification failed", { txId, error: errorMessage });
      throw new Error(`Verification failed: ${errorMessage}`);
    }
  }

  /**
   * Get network information
   */
  public async getNetworkInfo(useTestnet: boolean = false): Promise<{
    version: number;
    subversion: string;
    connections: number;
    network: string;
  }> {
    try {
      const info = await this.rpcCall<{
        version: number;
        subversion: string;
        connections: number;
      }>("getnetworkinfo", [], useTestnet);

      return {
        version: info.version,
        subversion: info.subversion,
        connections: info.connections,
        network: useTestnet ? "testnet" : "mainnet",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to get network info", { error: errorMessage });
      throw new Error(`Network info failed: ${errorMessage}`);
    }
  }
}

export const litecoinService = new LitecoinService();
