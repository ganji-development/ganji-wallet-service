import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH =
  process.env.SOLANA_WALLET_PATH || "secrets/master-keypair.json";
const TOKEN_MINT = process.env.GANJI_TOKEN_MINT;

async function main() {
  console.info("🧪 Testing GanjiCoin (GNJ) Transfer...\n");

  if (!TOKEN_MINT) {
    console.error("❌ GANJI_TOKEN_MINT not set in .env");
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const mintPubkey = new PublicKey(TOKEN_MINT);

  // 1. Load Master Wallet
  const resolvedPath = path.resolve(process.cwd(), WALLET_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Master wallet not found at: ${resolvedPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  const masterKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.info(`🔑 Master Wallet: ${masterKeypair.publicKey.toBase58()}`);

  // 2. Check Master Wallet's Token Balance
  const masterAta = await getAssociatedTokenAddress(
    mintPubkey,
    masterKeypair.publicKey
  );
  try {
    const masterAccount = await getAccount(connection, masterAta);
    const masterBalance = Number(masterAccount.amount) / 1_000_000_000;
    console.info(
      `💰 Master GNJ Balance: ${masterBalance.toLocaleString()} GNJ`
    );
  } catch {
    console.error(
      "❌ Master wallet has no GNJ token account. Did you run the mint script?"
    );
    process.exit(1);
  }

  // 3. Generate a random "User" wallet for testing
  const userKeypair = Keypair.generate();
  console.info(`\n👤 Test User Wallet: ${userKeypair.publicKey.toBase58()}`);

  // 4. Check User's Token Balance (should be 0 or non-existent)
  const userAta = await getAssociatedTokenAddress(
    mintPubkey,
    userKeypair.publicKey
  );
  console.info(`📦 User's ATA: ${userAta.toBase58()}`);

  try {
    const userAccount = await getAccount(connection, userAta);
    console.info(
      `💰 User's initial GNJ Balance: ${
        Number(userAccount.amount) / 1_000_000_000
      }`
    );
  } catch {
    console.info(`💰 User's initial GNJ Balance: 0 (no ATA yet)`);
  }

  // 5. Import and call solanaService.createLicense
  console.info("\n📤 Calling createLicense to transfer 1 GNJ...");

  // We need to dynamically import the service since it uses ESM
  try {
    const { solanaService } = await import("../src/services/solana.service.js");

    const result = await solanaService.createLicense(
      userKeypair.publicKey.toBase58(),
      "Test License",
      "https://example.com/metadata.json"
    );

    console.info(`✅ Transfer successful!`);
    console.info(`   Signature: ${result.signature}`);
    console.info(`   Mint: ${result.mintAddress}`);

    // 6. Verify User's new balance
    console.info("\n🔍 Verifying user's new balance...");
    const updatedUserAccount = await getAccount(connection, userAta);
    const newBalance = Number(updatedUserAccount.amount) / 1_000_000_000;
    console.info(`💰 User's new GNJ Balance: ${newBalance} GNJ`);

    if (newBalance >= 1) {
      console.info("\n🎉 TEST PASSED: User received 1 GNJ!");
    } else {
      console.error("\n❌ TEST FAILED: User did not receive expected tokens.");
    }
  } catch (error) {
    console.error("❌ Transfer failed:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
