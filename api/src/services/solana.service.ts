import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import { config } from "../config/index.js";
import { logger } from "./logger.service.js";
import {
  SolanaBalanceResponse,
  SolanaTransferResponse,
  CreateLicenseResponse,
  LicenseAccount,
} from "../types/solana.types.js";

import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import { IDL } from "../types/license.idl.js";
import fs from "fs";

// Define a minimal type for our program to avoid 'any'
interface LicenseProgram extends Idl {
  accounts: [
    {
      name: "licenseAccount";
      discriminator: [0, 0, 0, 0, 0, 0, 0, 0];
      type: {
        kind: "struct";
        fields: [
          { name: "owner"; type: "pubkey" },
          { name: "authority"; type: "pubkey" },
          { name: "softwareId"; type: "u64" },
          { name: "purchaseTimestamp"; type: "i64" },
          { name: "expirationTimestamp"; type: "i64" },
          { name: "isActive"; type: "bool" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
}

export class SolanaService {
  private connection: Connection;
  private testnetConnection: Connection;
  private masterKeypair: Keypair | null = null;
  private program: Program<LicenseProgram> | null = null;

  constructor() {
    // Default Devnet connection
    this.connection = new Connection(
      config.solana.rpcUrl,
      config.solana.commitment
    );
    // Initialize potential Testnet connection (if different URL provided or defaults)
    // For now we just use the same URL if not explicitly different, but structure is here
    this.testnetConnection = new Connection(
      config.solana.rpcUrl.replace("devnet", "testnet"),
      config.solana.commitment
    );
    this.loadMasterWallet();
  }

  private getConnection(useTestnet: boolean = false): Connection {
    return useTestnet ? this.testnetConnection : this.connection;
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

        // Initialize Anchor program
        const wallet = new Wallet(this.masterKeypair) as unknown as Wallet;
        const provider = new AnchorProvider(this.connection, wallet, {
          commitment: config.solana.commitment,
        });
        this.program = new Program(IDL as LicenseProgram, provider);
      } else {
        logger.warn(
          `Master wallet not found at: ${config.solana.walletPath}. Signing operations will fail.`
        );
      }
    } catch (error) {
      logger.error("Failed to load master wallet", { error });
    }
  }

  public async getBalance(
    address: string,
    useTestnet: boolean = false
  ): Promise<SolanaBalanceResponse> {
    try {
      const publicKey = new PublicKey(address);
      const connection = this.getConnection(useTestnet);
      const balance = await connection.getBalance(publicKey);

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
    amount: number,
    useTestnet: boolean = false
  ): Promise<SolanaTransferResponse> {
    if (!this.masterKeypair) {
      throw new Error("Master wallet not loaded");
    }

    try {
      const toPublicKey = new PublicKey(toAddress);
      const connection = this.getConnection(useTestnet);
      const lamports = amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.masterKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      logger.info(`Sending ${amount} SOL to ${toAddress}`);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.masterKeypair]
      );

      const status = await this.connection.getSignatureStatus(signature);

      return {
        signature,
        from: this.masterKeypair.publicKey.toBase58(),
        to: toAddress,
        amount,
        slot: status.value?.slot || 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Solana transfer failed", {
        toAddress,
        amount,
        error: errorMessage,
      });
      throw new Error(`Transfer failed: ${errorMessage}`);
    }
  }

  public async createLicense(
    recipientAddress: string,
    _name: string, // Unused for now
    _uri: string // Unused for now
  ): Promise<CreateLicenseResponse> {
    if (!this.masterKeypair || !this.program) {
      throw new Error("Master wallet or program not loaded");
    }

    try {
      let userPublicKey: PublicKey;
      const cleanAddress = recipientAddress.trim();
      try {
        userPublicKey = new PublicKey(cleanAddress);
      } catch {
        throw new Error(`Invalid recipient user address: "${cleanAddress}"`);
      }

      let programId: PublicKey;
      try {
        programId = this.program.programId;
        logger.info(`Program ID: ${programId.toBase58()}`);
      } catch {
        throw new Error("Could not get program ID from Anchor program object");
      }

      // Defaults
      const softwareIdNum = 1;
      const duration = 30 * 24 * 60 * 60; // 30 days

      // 1. Derive License PDA
      const [licensePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("license"),
          userPublicKey.toBuffer(),
          new BN(softwareIdNum).toArrayLike(Buffer, "le", 8),
        ],
        programId
      );

      logger.info(
        `Issuing license for ${recipientAddress} via PDA: ${licensePda.toBase58()}`
      );

      // 2. Call Program Instruction
      const signature = await this.program.methods
        .issueLicense(new BN(softwareIdNum), new BN(duration))
        .accounts({
          licenseAccount: licensePda,
          user: userPublicKey,
          authority: this.masterKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 3. (Optional) Also send 1 GNJ as an ecosystem credit
      try {
        const tokenMintStr = config.solana.tokenMint.trim();
        let mintPublicKey: PublicKey;
        try {
          mintPublicKey = new PublicKey(tokenMintStr);
        } catch {
          throw new Error(
            `Invalid token mint address in config: "${tokenMintStr}"`
          );
        }

        const sourceAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.masterKeypair,
          mintPublicKey,
          this.masterKeypair.publicKey
        );
        const destinationAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.masterKeypair,
          mintPublicKey,
          userPublicKey
        );
        const amount = 1 * 1_000_000_000;
        const transferTx = new Transaction().add(
          createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            this.masterKeypair.publicKey,
            amount
          )
        );
        await sendAndConfirmTransaction(this.connection, transferTx, [
          this.masterKeypair,
        ]);
        logger.info(`Sent 1 GNJ welcome token to ${recipientAddress}`);
      } catch (tokenError) {
        logger.warn("License issued but token transfer failed", {
          error: tokenError instanceof Error ? tokenError.message : tokenError,
        });
        // Don't fail the whole request if just token fails
      }

      return {
        mintAddress: licensePda.toBase58(), // Using PDA as 'id' for now
        signature,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to issue license", { error: errorMessage });
      throw new Error(`License issuance failed: ${errorMessage}`);
    }
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
    amount: number,
    useTestnet: boolean = false
  ): Promise<string> {
    const response = await this.transfer(toAddress, amount, useTestnet);
    return response.signature;
  }

  public async getLicenseState(
    recipientAddress: string,
    softwareId: number = 1
  ): Promise<LicenseAccount> {
    if (!this.program) {
      throw new Error("Program not loaded");
    }

    const userPublicKey = new PublicKey(recipientAddress);
    const [licensePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("license"),
        userPublicKey.toBuffer(),
        new BN(softwareId).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    try {
      // Use bracket notation with a specific type cast to avoid 'any'
      const accountClient = this.program.account as unknown as {
        licenseAccount: {
          fetch: (address: PublicKey) => Promise<LicenseAccount>;
        };
      };
      const data = await accountClient.licenseAccount.fetch(licensePda);
      return data;
    } catch (error) {
      logger.error("Failed to fetch license state", { error });
      throw new Error("License not found or account not initialized");
    }
  }

  public async renewLicense(
    recipientAddress: string,
    durationSeconds: number,
    softwareId: number = 1
  ): Promise<string> {
    if (!this.masterKeypair || !this.program) {
      throw new Error("Master wallet or program not loaded");
    }

    const userPublicKey = new PublicKey(recipientAddress);
    const [licensePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("license"),
        userPublicKey.toBuffer(),
        new BN(softwareId).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    try {
      const signature = await this.program.methods
        .renewLicense(new BN(durationSeconds))
        .accounts({
          licenseAccount: licensePda,
          authority: this.masterKeypair.publicKey,
        })
        .rpc();

      return signature;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to renew license", { error: errorMessage });
      throw new Error(`License renewal failed: ${errorMessage}`);
    }
  }
}

export const solanaService = new SolanaService();
