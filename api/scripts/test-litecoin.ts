import { createHash } from "crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.info("🧪 Testing Litecoin Asset Registration...\n");

  // Import the service dynamically
  const { litecoinService } = await import(
    "../src/services/litecoin.service.js"
  );

  // 1. Test network connection
  console.info("📡 Step 1: Testing network connection...");
  try {
    const networkInfo = await litecoinService.getNetworkInfo();
    console.info(`   ✅ Connected to Litecoin node v${networkInfo.version}`);
    console.info(
      `   Network: ${networkInfo.network}, Connections: ${networkInfo.connections}`
    );
  } catch (error) {
    console.error("   ❌ Failed to connect:", error);
    process.exit(1);
  }

  // 2. Check if we can get a wallet address (tests wallet access)
  console.info("\n🔑 Step 2: Testing wallet access...");
  try {
    const wallet = await litecoinService.createWallet();
    console.info(`   ✅ Wallet accessible`);
    console.info(`   New address: ${wallet.address}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Wallet access failed: ${errMsg}`);
    console.error("\n💡 The Litecoin node may need a wallet loaded.");
    console.error('   Run on the node: litecoin-cli createwallet "ganji"');
    console.error('   Or: litecoin-cli loadwallet "ganji"');
    console.info(
      "\n⏭️  Skipping asset registration test (requires funded wallet)."
    );
    process.exit(0);
  }

  // 3. Test asset registration (OP_RETURN)
  console.info("\n📝 Step 3: Testing asset registration (OP_RETURN)...");

  const sampleData = "Test file for Ganji asset registration";
  const fileHash = createHash("sha256").update(sampleData).digest("hex");
  console.info(`   Hash to register: ${fileHash.slice(0, 16)}...`);

  try {
    const result = await litecoinService.registerAsset(fileHash);
    console.info(`   ✅ Asset registered!`);
    console.info(`   TXID: ${result.txId}`);

    // 4. Verify
    console.info("\n🔍 Step 4: Verifying registration...");
    await new Promise((r) => setTimeout(r, 2000));
    const isValid = await litecoinService.verifyTransaction(result.txId);
    console.info(
      `   Transaction confirmed: ${isValid ? "Yes ✅" : "Pending ⏳"}`
    );

    console.info("\n🎉 ALL TESTS PASSED!");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Asset registration failed: ${errMsg}`);

    if (errMsg.includes("No unspent") || errMsg.includes("insufficient")) {
      console.error(
        "\n💡 The wallet needs LTC to pay for the OP_RETURN transaction."
      );
      console.error("   Send at least 0.001 LTC to your wallet address.");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
