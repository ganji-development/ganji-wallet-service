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
  private connection: Connection | null = null;
  private testnetConnection: Connection;
  private mainnetKeypair: Keypair | null = null;
  private testnetKeypair: Keypair | null = null;
  // Program ID can differ per network
  private mainnetProgram: Program<LicenseProgram> | null = null;
  private testnetProgram: Program<LicenseProgram> | null = null;

  constructor() {
    // Mainnet connection (optional)
    if (config.solana.mainnet.rpcUrl) {
      this.connection = new Connection(
        config.solana.mainnet.rpcUrl,
        config.solana.mainnet.commitment
      );
    }
    // Testnet connection (required)
    this.testnetConnection = new Connection(
      config.solana.testnet.rpcUrl,
      config.solana.testnet.commitment
    );
    this.loadWallets();
  }

  private getConnection(useTestnet: boolean = false): Connection {
    if (useTestnet) {
      return this.testnetConnection;
    }
    if (!this.connection) {
      throw new Error("Mainnet connection not configured");
    }
    return this.connection;
  }

  private getKeypair(useTestnet: boolean = false): Keypair | null {
    return useTestnet ? this.testnetKeypair : this.mainnetKeypair;
  }

  private getProgram(
    useTestnet: boolean = false
  ): Program<LicenseProgram> | null {
    return useTestnet ? this.testnetProgram : this.mainnetProgram;
  }

  private loadWallets(): void {
    // Load Mainnet Wallet (if configured)
    if (config.solana.mainnet.walletPath && this.connection) {
      try {
        if (fs.existsSync(config.solana.mainnet.walletPath)) {
          const keyData = JSON.parse(
            fs.readFileSync(config.solana.mainnet.walletPath, "utf-8")
          );
          this.mainnetKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
          logger.info(
            `Mainnet wallet loaded: ${this.mainnetKeypair.publicKey.toBase58()}`
          );

          // Init Mainnet Anchor
          const wallet = new Wallet(this.mainnetKeypair) as unknown as Wallet;
          const provider = new AnchorProvider(this.connection, wallet, {
            commitment: config.solana.mainnet.commitment,
          });
          // Note: IDL address field is static, but we override programId via Program constructor if needed,
          // essentially we ignore the IDL address default for multi-chain support
          this.mainnetProgram = new Program(IDL as LicenseProgram, provider);
        } else {
          logger.warn(
            `Mainnet wallet not found at: ${config.solana.mainnet.walletPath}`
          );
        }
      } catch (e) {
        logger.error("Failed to load Mainnet wallet", { error: e });
      }
    } else {
      logger.info("Mainnet wallet not configured, skipping");
    }

    // Load Testnet Wallet
    try {
      if (fs.existsSync(config.solana.testnet.walletPath)) {
        const keyData = JSON.parse(
          fs.readFileSync(config.solana.testnet.walletPath, "utf-8")
        );
        this.testnetKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
        logger.info(
          `Testnet wallet loaded: ${this.testnetKeypair.publicKey.toBase58()}`
        );

        // Init Testnet Anchor
        const wallet = new Wallet(this.testnetKeypair) as unknown as Wallet;
        const provider = new AnchorProvider(this.testnetConnection, wallet, {
          commitment: config.solana.testnet.commitment,
        });
        this.testnetProgram = new Program(IDL as LicenseProgram, provider);
      } else {
        logger.warn(
          `Testnet wallet not found at: ${config.solana.testnet.walletPath}`
        );
      }
    } catch (e) {
      logger.error("Failed to load Testnet wallet", { error: e });
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
    const keypair = this.getKeypair(useTestnet);
    if (!keypair) {
      throw new Error(
        `Master wallet not loaded for ${useTestnet ? "Testnet" : "Mainnet"}`
      );
    }

    try {
      const toPublicKey = new PublicKey(toAddress);
      const connection = this.getConnection(useTestnet);
      const lamports = amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      logger.info(`Sending ${amount} SOL to ${toAddress}`);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair]
      );

      const status = await connection.getSignatureStatus(signature);

      return {
        signature,
        from: keypair.publicKey.toBase58(),
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
    _uri: string, // Unused for now
    useTestnet: boolean = false
  ): Promise<CreateLicenseResponse> {
    const keypair = this.getKeypair(useTestnet);
    const program = this.getProgram(useTestnet);

    if (!keypair || !program) {
      throw new Error(
        `Master wallet or program not loaded for ${
          useTestnet ? "Testnet" : "Mainnet"
        }`
      );
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
        programId = program.programId;
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
      const signature = await program.methods
        .issueLicense(new BN(softwareIdNum), new BN(duration))
        .accounts({
          licenseAccount: licensePda,
          user: userPublicKey,
          authority: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 3. (Optional) Also send 1 GNJ as an ecosystem credit
      try {
        const tokenMint = useTestnet
          ? config.solana.testnet.tokenMint
          : config.solana.mainnet.tokenMint;

        if (!tokenMint) {
          logger.warn(
            "Token mint not configured, skipping welcome token transfer"
          );
          return {
            mintAddress: licensePda.toBase58(),
            signature,
          };
        }

        const tokenMintStr = tokenMint.trim();
        let mintPublicKey: PublicKey;
        try {
          mintPublicKey = new PublicKey(tokenMintStr);
        } catch {
          throw new Error(
            `Invalid token mint address in config: "${tokenMintStr}"`
          );
        }

        const connection = this.getConnection(useTestnet);
        const sourceAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          keypair,
          mintPublicKey,
          keypair.publicKey
        );
        const destinationAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          keypair,
          mintPublicKey,
          userPublicKey
        );
        const amount = 1 * 1_000_000_000;
        const transferTx = new Transaction().add(
          createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            keypair.publicKey,
            amount
          )
        );
        await sendAndConfirmTransaction(connection, transferTx, [keypair]);
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
    softwareId: number = 1,
    useTestnet: boolean = false
  ): Promise<LicenseAccount> {
    const program = this.getProgram(useTestnet);
    if (!program) {
      throw new Error("Program not loaded");
    }

    const userPublicKey = new PublicKey(recipientAddress);
    const [licensePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("license"),
        userPublicKey.toBuffer(),
        new BN(softwareId).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      // Use bracket notation with a specific type cast to avoid 'any'
      const accountClient = program.account as unknown as {
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
    softwareId: number = 1,
    useTestnet: boolean = false
  ): Promise<string> {
    const keypair = this.getKeypair(useTestnet);
    const program = this.getProgram(useTestnet);

    if (!keypair || !program) {
      throw new Error(
        `Master wallet or program not loaded for ${
          useTestnet ? "Testnet" : "Mainnet"
        }`
      );
    }

    const userPublicKey = new PublicKey(recipientAddress);
    const [licensePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("license"),
        userPublicKey.toBuffer(),
        new BN(softwareId).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      const signature = await program.methods
        .renewLicense(new BN(durationSeconds))
        .accounts({
          licenseAccount: licensePda,
          authority: keypair.publicKey,
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
