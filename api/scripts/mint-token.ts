import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createAndMint,
  TokenStandard,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import {
  generateSigner,
  percentAmount,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair as Web3JsKeypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH =
  process.env.SOLANA_WALLET_PATH || "secrets/master-keypair.json";

// ==========================================================
// 🚨 TOKEN DETAILS - REPLACE THESE BEFORE RUNNING 🚨
// ==========================================================
const TOKEN_NAME = "GanjiCoin";
const TOKEN_SYMBOL = "GNJ";
const TOKEN_URI =
  "https://arweave.net/EswiHFtFcbzFnffXGwaeMJsttyEfhXpv6RZFdwvYHXJB";
const DECIMALS = 9;
const INITIAL_SUPPLY = 100_000_000;
// ==========================================================

async function main() {
  console.info("🚀 Initializing Metaplex Umi...");

  // 1. Setup Umi with required plugins
  const umi = createUmi(RPC_URL).use(mplTokenMetadata()).use(mplToolbox());

  // 2. Load Master Wallet
  const resolvedPath = path.resolve(process.cwd(), WALLET_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Master wallet not found at: ${resolvedPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  const web3JsKeypair = Web3JsKeypair.fromSecretKey(new Uint8Array(secretKey));

  // Convert to Umi format
  const masterSigner = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(web3JsKeypair)
  );
  umi.use(signerIdentity(masterSigner));

  console.info(`🔑 Master Wallet: ${masterSigner.publicKey}`);

  if (!TOKEN_NAME || !TOKEN_SYMBOL) {
    console.error("❌ TOKEN_NAME and TOKEN_SYMBOL are required.");
    process.exit(1);
  }

  // 3. Create Mint and Metadata
  console.info(`🛠️  Creating and Minting ${TOKEN_NAME} (${TOKEN_SYMBOL})...`);

  const mint = generateSigner(umi);

  const tx = createAndMint(umi, {
    mint,
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    uri: TOKEN_URI,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: DECIMALS,
    amount: INITIAL_SUPPLY * 10 ** DECIMALS,
    tokenOwner: masterSigner.publicKey,
    tokenStandard: TokenStandard.Fungible, // Fungible = SPL Token with Metadata
  });

  console.info("📤 Sending transaction...");

  const result = await tx.sendAndConfirm(umi);

  console.info("\n✅ SUCCESS!");
  console.info(`Signature:   ${Buffer.from(result.signature).toString("hex")}`);
  console.info(`Mint Address: ${mint.publicKey}`);
  console.info(`Owner:        ${masterSigner.publicKey}`);
  console.info(`Supply:       ${INITIAL_SUPPLY} tokens minted to your wallet.`);

  console.info("\n👉 IMPORTANT: Add this to your .env:");
  console.info(`SOLANA_TOKEN_MINT=${mint.publicKey}`);
}

main().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
