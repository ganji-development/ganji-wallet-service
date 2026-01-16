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

// Token Metadata
const TOKEN_NAME = "GanjiCoin";
const TOKEN_SYMBOL = "GNJ";
const TOKEN_DESCRIPTION = "The official currency of the Ganji ecosystem.";

async function main() {
  console.info("🚀 Starting Metadata Upload to Arweave (via Irys)...");

  // 1. Load Master Wallet
  const resolvedWalletPath = path.resolve(process.cwd(), WALLET_PATH);
  if (!fs.existsSync(resolvedWalletPath)) {
    console.error(`❌ Master wallet not found at: ${resolvedWalletPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(resolvedWalletPath, "utf-8"));

  // 2. Initialize Irys
  // Determine if we are on devnet or mainnet
  const isDevnet = RPC_URL.includes("devnet");

  const irys = await Uploader(Solana)
    .withWallet(secretKey)
    .withRpc(RPC_URL)
    .devnet();

  console.info(`📡 Connected to Irys on ${isDevnet ? "Devnet" : "Mainnet"}`);
  console.info(`👛 Wallet Address: ${irys.address}`);

  // 3. Check and Fund Irys (if needed)
  const imageBuffer = fs.readFileSync(IMAGE_PATH); // Moved up for price calculation
  const price = await irys.getPrice(imageBuffer.length + 1024); // Image + buffer for JSON
  console.info(`📊 Actual storage cost: ${irys.utils.fromAtomic(price)} SOL`);

  const balance = await irys.getBalance();
  console.info(
    `💰 Current Irys Node Balance: ${irys.utils.fromAtomic(balance)} SOL`
  );

  if (balance.lt(price)) {
    const fundAmount = price.multipliedBy(1.1); // Add 10% buffer
    console.info(
      `💸 Funding Irys node with ${irys.utils.fromAtomic(
        fundAmount.integerValue()
      )} SOL...`
    );
    try {
      await irys.fund(fundAmount.integerValue());
      console.info("✅ Funding successful!");
    } catch (e) {
      console.error(
        "❌ Funding failed. Make sure your master wallet has SOL.",
        e
      );
      process.exit(1);
    }
  }

  // 4. Upload Image
  console.info(`🖼️  Uploading image: ${IMAGE_PATH}...`);
  // Note: imageBuffer already read above for price calculation
  const imageUpload = await irys.upload(imageBuffer, {
    tags: [{ name: "Content-Type", value: "image/png" }],
  });

  const imageUrl = `https://arweave.net/${imageUpload.id}`;
  console.info(`✅ Image uploaded! URL: ${imageUrl}`);

  // 5. Create and Upload Metadata JSON
  const metadata = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    description: TOKEN_DESCRIPTION,
    image: imageUrl,
    external_url: "https://ganjidevelopment.com",
    attributes: [],
    properties: {
      files: [
        {
          uri: imageUrl,
          type: "image/png",
        },
      ],
      category: "image",
    },
  };

  console.info("📝 Uploading metadata JSON...");
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const metadataUpload = await irys.upload(metadataBuffer, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  });

  const metadataUrl = `https://arweave.net/${metadataUpload.id}`;
  console.info("\n✨ ALL DONE!");
  console.info(`Final Token URI: ${metadataUrl}`);
  console.info(
    "\n👉 Copy this URI into your mint-token.ts script's TOKEN_URI variable."
  );
}

main().catch((err) => {
  console.error("💀 Upload failed:", err);
});
