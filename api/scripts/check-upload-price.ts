import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH =
  process.env.SOLANA_WALLET_PATH || "secrets/master-keypair.json";
const IMAGE_PATH = path.resolve(process.cwd(), "../docs/GanjiCoin-512.png");

async function main() {
  console.info("📊 Checking Arweave Upload Price (via Irys)...\n");

  // 1. Load Master Wallet
  const resolvedWalletPath = path.resolve(process.cwd(), WALLET_PATH);
  if (!fs.existsSync(resolvedWalletPath)) {
    console.error(`❌ Master wallet not found at: ${resolvedWalletPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(resolvedWalletPath, "utf-8"));

  // 2. Check image file
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`❌ Image file not found at: ${IMAGE_PATH}`);
    process.exit(1);
  }

  const imageStats = fs.statSync(IMAGE_PATH);
  const imageSizeBytes = imageStats.size;
  const imageSizeKB = (imageSizeBytes / 1024).toFixed(2);
  console.info(`🖼️  Image: ${IMAGE_PATH}`);
  console.info(`📏 Size: ${imageSizeKB} KB (${imageSizeBytes} bytes)`);

  // 3. Initialize Irys
  const isDevnet = RPC_URL.includes("devnet");

  const irys = await Uploader(Solana)
    .withWallet(secretKey)
    .withRpc(RPC_URL)
    .devnet();

  console.info(`\n📡 Network: ${isDevnet ? "Devnet" : "Mainnet"}`);
  console.info(`👛 Wallet: ${irys.address}`);

  // 4. Get price for image + metadata JSON (~1KB buffer)
  const totalBytes = imageSizeBytes + 1024;
  const price = await irys.getPrice(totalBytes);
  const priceInSol = irys.utils.fromAtomic(price);

  // Estimate USD (rough SOL price)
  const solPrice = 140; // Approximate SOL price in USD
  const priceInUsd = (parseFloat(priceInSol.toString()) * solPrice).toFixed(6);

  console.info(`\n--- PRICE ESTIMATE ---`);
  console.info(`📦 Total data: ${(totalBytes / 1024).toFixed(2)} KB`);
  console.info(`💰 Cost: ${priceInSol} SOL`);
  console.info(`💵 Approx: $${priceInUsd} USD (at $${solPrice}/SOL)`);
  console.info(`----------------------\n`);

  // 5. Check current Irys balance
  const balance = await irys.getBalance();
  const balanceInSol = irys.utils.fromAtomic(balance);
  console.info(`🏦 Your Irys Node Balance: ${balanceInSol} SOL`);

  if (balance.gte(price)) {
    console.info(`✅ You have enough balance. Ready to upload!`);
  } else {
    const needed = price.minus(balance);
    console.info(
      `⚠️  You need to fund ~${irys.utils.fromAtomic(
        needed
      )} more SOL to upload.`
    );
  }

  console.info(
    `\n👉 Run "npx tsx scripts/upload-metadata.ts" when ready to upload.`
  );
}

main().catch((err) => {
  console.error("💀 Price check failed:", err);
});
