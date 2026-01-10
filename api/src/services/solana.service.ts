import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { config } from "../config/index.js";
import { logger } from "./logger.service.js";
import {
  SolanaBalanceResponse,
  SolanaTransferResponse,
  CreateLicenseResponse,
} from "../types/solana.types.js";

import fs from "fs";

export class SolanaService {
  private connection: Connection;
  private masterKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(
      config.solana.rpcUrl,
      config.solana.commitment
    );
    this.loadMasterWallet();
  }

  private loadMasterWallet(): void {
    try {
      if (fs.existsSync(config.solana.walletPath)) {
        const keyData = JSON.parse(
          fs.readFileSync(config.solana.walletPath, "utf-8")
        );
        this.masterKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
        logger.info(
          `Master wallet loaded: ${this.masterKeypair.publicKey.toBase58()}`
        );
      } else {
        logger.warn(
          `Master wallet not found at: ${config.solana.walletPath}. Signing operations will fail.`
        );
      }
    } catch (error) {
      logger.error("Failed to load master wallet", { error });
    }
  }

  public async getBalance(address: string): Promise<SolanaBalanceResponse> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);

      return {
        address,
        balance: balance / LAMPORTS_PER_SOL,
        lamports: balance,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error fetching Solana balance", {
        address,
        error: errorMessage,
      });
      throw new Error(`Failed to get balance: ${errorMessage}`);
    }
  }

  public async createWallet(): Promise<{
    publicKey: string;
    secretKey: string;
  }> {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: Buffer.from(keypair.secretKey).toString("hex"),
    };
  }

  public async transfer(
    toAddress: string,
    amount: number
  ): Promise<SolanaTransferResponse> {
    if (!this.masterKeypair) {
      throw new Error("Master wallet not loaded");
    }

    logger.debug("Solana transfer requested", { toAddress, amount });
    // In a real implementation, we would build the transaction here using this.masterKeypair
    return {
      signature: "mock_signature_signed_by_master",
      from: this.masterKeypair.publicKey.toBase58(),
      to: toAddress,
      amount,
      slot: 12345,
    };
  }

  public async createLicense(
    _name: string,
    _symbol: string,
    _uri: string
  ): Promise<CreateLicenseResponse> {
    if (!this.masterKeypair) {
      throw new Error("Master wallet not loaded");
    }
    // Implementation would use this.masterKeypair to mint
    return {
      mintAddress: "mock_mint",
      signature: "mock_sig_signed_by_master",
    };
  }

  public async verifySignature(
    _signature: string,
    _address: string
  ): Promise<boolean> {
    logger.debug("Solana verifySignature requested");
    return true;
  }

  public async signAndSendTransaction(
    toAddress: string,
    amount: number
  ): Promise<{ signature: string }> {
    if (!this.masterKeypair) {
      throw new Error("Master wallet not loaded");
    }
    logger.debug("Solana signAndSendTransaction requested", {
      toAddress,
      amount,
    });
    return { signature: "mock_signed_signature_by_master" };
  }
}

export const solanaService = new SolanaService();
