import { Keypair } from "@solana/web3.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  console.info("🧪 Testing Solana License Issuance Program...\n");

  // Import the service dynamically
  const { solanaService } = await import("../src/services/solana.service.js");

  // 1. Generate a random user wallet
  const tempKeypair = Keypair.generate();
  const userAddress = tempKeypair.publicKey.toBase58();
  console.info(`👤 Target User: ${userAddress}`);

  try {
    // 2. Issuing the License
    console.info("📝 Issuing License (Anchor PDA initialization)...");
    const result = await solanaService.createLicense(
      userAddress,
      "Ganji Pro",
      "https://ganji.com/metadata"
    );

    console.info("✅ License issued successfully!");
    console.info(`   Signature: ${result.signature}`);
    console.info(`   License PDA (ID): ${result.mintAddress}`);

    // Wait for confirmation
    console.info("\n⏳ Waiting for transaction confirmation...");
    await new Promise((r) => setTimeout(r, 5000));

    // 3. Fetching License State
    console.info("🔍 Fetching License State from chain...");
    const state = await solanaService.getLicenseState(userAddress);

    console.info("\n📋 On-chain License Data:");
    console.info(`   Owner: ${state.owner.toBase58()}`);
    console.info(`   Software ID: ${state.softwareId.toString()}`);
    console.info(`   Active: ${state.isActive}`);
    console.info(
      `   Expires: ${new Date(
        state.expirationTimestamp.toNumber() * 1000
      ).toLocaleString()}`
    );

    // 4. Testing Renewal
    console.info("\n🔄 Testing License Renewal (adds 30 days)...");
    const renewalSig = await solanaService.renewLicense(
      userAddress,
      30 * 24 * 60 * 60
    );
    console.info(`✅ License renewed! Signature: ${renewalSig}`);

    // Wait and verify again
    console.info("⏳ Verifying renewal...");
    await new Promise((r) => setTimeout(r, 5000));
    const newState = await solanaService.getLicenseState(userAddress);
    console.info(
      `   New Expiry: ${new Date(
        newState.expirationTimestamp.toNumber() * 1000
      ).toLocaleString()}`
    );

    console.info("\n🎉 PROGRAM INTEGRATION VERIFIED!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
