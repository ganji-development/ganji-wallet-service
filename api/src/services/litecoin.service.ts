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

interface RpcError extends Error {
  message: string;
}

export class LitecoinService {
  private mainnetConfig: { url: string; auth: string } | null = null;
  private testnetConfig: { url: string; auth: string };
  private readonly WALLET_NAME = "ganji";

  constructor() {
    // Mainnet config (optional)
    if (
      config.litecoin.mainnet.url &&
      config.litecoin.mainnet.username &&
      config.litecoin.mainnet.password
    ) {
      this.mainnetConfig = {
        url: config.litecoin.mainnet.url,
        auth: `Basic ${Buffer.from(
          `${config.litecoin.mainnet.username}:${config.litecoin.mainnet.password}`
        ).toString("base64")}`,
      };
    }

    // Testnet config (required)
    this.testnetConfig = {
      url: config.litecoin.testnet.url,
      auth: `Basic ${Buffer.from(
        `${config.litecoin.testnet.username}:${config.litecoin.testnet.password}`
      ).toString("base64")}`,
    };
  }

  private getConfig(useTestnet: boolean) {
    if (useTestnet) {
      return this.testnetConfig;
    }
    if (!this.mainnetConfig) {
      throw new Error("Mainnet Litecoin not configured");
    }
    return this.mainnetConfig;
  }

  /**
   * Make a JSON-RPC call to the Litecoin node
   */
  private async rpcCall<T>(
    method: string,
    params: unknown[] = [],
    useTestnet: boolean = false,
    useWallet: boolean = false
  ): Promise<T> {
    const { url, auth } = this.getConfig(useTestnet);

    let rpcUrl = url;
    if (useWallet) {
      rpcUrl = url.endsWith("/")
        ? `${url}wallet/${this.WALLET_NAME}`
        : `${url}/wallet/${this.WALLET_NAME}`;
    }

    const response = await fetch(rpcUrl, {
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
        useTestnet,
        true
      );
      const unconfirmed = await this.rpcCall<number>(
        "getreceivedbyaddress",
        [address, 0],
        useTestnet,
        true
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
      // Try to get address
      return await this._generateWallet(useTestnet);
    } catch (error: unknown) {
      const rpcError = error as RpcError;
      // If no wallet loaded (code: -18)
      if (rpcError.message?.includes("code: -18")) {
        logger.warn(
          `No Litecoin wallet loaded, attempting to init '${this.WALLET_NAME}'...`
        );
        await this.ensureWalletLoaded(useTestnet);
        // Retry
        return await this._generateWallet(useTestnet);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error creating Litecoin wallet", { error: errorMessage });
      throw new Error(`Failed to create wallet: ${errorMessage}`);
    }
  }

  private async ensureWalletLoaded(useTestnet: boolean): Promise<void> {
    try {
      await this.rpcCall("loadwallet", [this.WALLET_NAME], useTestnet);
      logger.info(`Loaded Litecoin wallet: ${this.WALLET_NAME}`);
    } catch (e: unknown) {
      const rpcError = e as RpcError;
      if (rpcError.message?.includes("code: -35")) return;

      try {
        await this.rpcCall("createwallet", [this.WALLET_NAME], useTestnet);
        logger.info(`Created Litecoin wallet: ${this.WALLET_NAME}`);
      } catch (createErr: unknown) {
        const createRpcError = createErr as RpcError;
        if (createRpcError.message?.includes("code: -4")) return;
        logger.warn(`Failed to auto-init wallet: ${createRpcError.message}`);
      }
    }
  }

  private async _generateWallet(
    useTestnet: boolean
  ): Promise<{ address: string; privateKey: string }> {
    const address = await this.rpcCall<string>(
      "getnewaddress",
      [this.WALLET_NAME],
      useTestnet,
      true
    );
    const privateKey = await this.rpcCall<string>(
      "dumpprivkey",
      [address],
      useTestnet,
      true
    );
    return { address, privateKey };
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
        useTestnet,
        true
      );

      // Get transaction details for fee info
      const txInfo = await this.rpcCall<{ fee: number }>(
        "gettransaction",
        [txId],
        useTestnet,
        true
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
      // 1. Get unspent outputs to fund the transaction
      let unspent: UnspentOutput[];
      try {
        unspent = await this.rpcCall<UnspentOutput[]>(
          "listunspent",
          [1, 9999999],
          useTestnet,
          true
        );
      } catch (e: unknown) {
        const rpcError = e as RpcError;
        if (rpcError.message?.includes("code: -18")) {
          await this.ensureWalletLoaded(useTestnet);
          unspent = await this.rpcCall<UnspentOutput[]>(
            "listunspent",
            [1, 9999999],
            useTestnet,
            true
          );
        } else {
          throw e;
        }
      }

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
        useTestnet,
        true
      );

      // 3. Sign the transaction
      const signedResult = await this.rpcCall<{
        hex: string;
        complete: boolean;
      }>("signrawtransactionwithwallet", [rawTx], useTestnet, true);

      if (!signedResult.complete) {
        throw new Error("Transaction signing incomplete");
      }

      // 4. Broadcast the transaction
      const txId = await this.rpcCall<string>(
        "sendrawtransaction",
        [signedResult.hex],
        useTestnet,
        true
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

      const time = tx.blocktime || tx.time || Math.floor(Date.now() / 1000);
      return {
        valid: (tx.confirmations || 0) >= 1,
        timestamp: new Date(time * 1000).toISOString(),
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
