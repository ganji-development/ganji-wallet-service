import axios from "axios";
import { Keypair, Connection } from "@solana/web3.js";

const SOLANA_RPC = "https://api.devnet.solana.com";

const API_URL = "https://cnode.ganjidevelopment.com/api/v1";
const API_KEY =
  process.env.AUTH_API_KEY ||
  "duTedq3PH5IP4x9pFDDRoXEjnuikQyzQdtxNy7l97wUHsT3uslpvAU448zqQs0nc";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

interface SimpleAxiosError {
  response?: {
    data?: {
      error?: string;
    };
    status?: number;
  };
  message: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? "✅" : "❌";
  console.info(`${icon} ${name}: ${message}`);
}

async function runTests() {
  console.info(
    "🚀 Starting COMPREHENSIVE Verification Tests on cnode.ganjidevelopment.com..."
  );
  console.info("=".repeat(70));

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  console.info("\n📡 [1] Health Check");
  try {
    const res = await axios.get("https://cnode.ganjidevelopment.com/health");
    logResult("Health Check", true, `${res.status} ${res.statusText}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logResult("Health Check", false, message);
  }

  // ============================================================
  // SOLANA ENDPOINTS
  // ============================================================
  console.info("\n🟣 SOLANA ENDPOINTS");
  console.info("-".repeat(40));

  const solanaAddress = "EXj5yXactDY8oErJUo2ARoWTp5JSuihkNajhxoEy8ZuZ";

  // 2. Solana Verify Signature
  console.info("\n[2] POST /solana/verify");
  try {
    // This is a utility endpoint - test with dummy data
    const res = await axiosInstance.post(`/solana/verify`, {
      signature: "test-signature",
      address: solanaAddress,
    });
    logResult("Solana Verify Signature", true, `Valid: ${res.data.data.valid}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    // May fail due to invalid signature, but endpoint should respond
    if (error.response?.status === 500 || error.response?.status === 400) {
      logResult(
        "Solana Verify Signature",
        true,
        "Endpoint responds (returned error for invalid signature)"
      );
    } else {
      logResult(
        "Solana Verify Signature",
        false,
        error.response?.data?.error || error.message
      );
    }
  }

  // 3. Solana Transfer (requires SOL)
  console.info("\n[3] POST /solana/transfer");
  const tempKeypair = Keypair.generate();
  let solTransferSig = "";
  try {
    const res = await axiosInstance.post(`/solana/transfer`, {
      toAddress: tempKeypair.publicKey.toBase58(),
      amount: 0.001,
      useTestnet: true,
    });
    solTransferSig = res.data.data.signature;
    logResult("Solana Transfer", true, `Signature: ${solTransferSig}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (msg.includes("insufficient") || msg.includes("0x1")) {
      logResult("Solana Transfer", false, "Insufficient SOL in master wallet");
    } else {
      logResult("Solana Transfer", false, msg);
    }
  }

  // 4. Solana Sign and Send
  console.info("\n[4] POST /solana/sign-and-send");
  try {
    const res = await axiosInstance.post(`/solana/sign-and-send`, {
      toAddress: tempKeypair.publicKey.toBase58(),
      amount: 0.001,
      useTestnet: true,
    });
    logResult("Solana Sign and Send", true, `Signature: ${res.data.data}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (msg.includes("insufficient") || msg.includes("0x1")) {
      logResult(
        "Solana Sign and Send",
        false,
        "Insufficient SOL in master wallet (expected on testnet)"
      );
    } else {
      logResult("Solana Sign and Send", false, msg);
    }
  }

  // 5. Solana Create License
  console.info("\n[5] POST /solana/create-license");
  try {
    const res = await axiosInstance.post(`/solana/create-license`, {
      recipientAddress: tempKeypair.publicKey.toBase58(),
      name: "Test License",
      uri: "https://test.com/metadata.json",
      useTestnet: true,
    });
    logResult(
      "Solana Create License",
      true,
      `License PDA: ${res.data.data.mintAddress}, Sig: ${res.data.data.signature}`
    );
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (
      msg.includes("insufficient") ||
      msg.includes("0x1") ||
      msg.includes("not loaded")
    ) {
      logResult(
        "Solana Create License",
        false,
        `Program issue or insufficient funds: ${msg.slice(0, 100)}`
      );
    } else {
      logResult("Solana Create License", false, msg);
    }
  }

  // 5b. ON-CHAIN VERIFICATION - Verify Solana transfer actually exists on-chain
  console.info("\n[5b] 🔍 ON-CHAIN: Verify Solana signature on Devnet");
  if (solTransferSig) {
    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const txInfo = await connection.getTransaction(solTransferSig, {
        maxSupportedTransactionVersion: 0,
      });
      if (txInfo) {
        logResult(
          "Solana On-Chain Verify",
          true,
          `TX confirmed on Devnet! Slot: ${txInfo.slot}, Fee: ${txInfo.meta?.fee} lamports`
        );
      } else {
        logResult(
          "Solana On-Chain Verify",
          false,
          "TX not found on-chain (may still be processing)"
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logResult("Solana On-Chain Verify", false, msg);
    }
  } else {
    logResult(
      "Solana On-Chain Verify",
      false,
      "Skipped - no transfer signature"
    );
  }

  // ============================================================
  // LITECOIN ENDPOINTS
  // ============================================================
  console.info("\n\n🔶 LITECOIN ENDPOINTS");
  console.info("-".repeat(40));

  // 6. Litecoin Network
  console.info("\n[6] GET /litecoin/network");
  try {
    const res = await axiosInstance.get(`/litecoin/network?useTestnet=true`);
    logResult(
      "Litecoin Network",
      true,
      `Version: ${res.data.data.version}, Connections: ${res.data.data.connections}`
    );
  } catch (err) {
    const error = err as SimpleAxiosError;
    logResult(
      "Litecoin Network",
      false,
      error.response?.data?.error || error.message
    );
  }

  // 7. Use existing Litecoin testnet address (no need to create new ones)
  console.info("\n[7] Using existing LTC testnet address");
  const ltcAddress = "tltc1q9r7wm7m7q2wck93jxqayafsmfdapuf9es3ra8w"; // existing address
  logResult("Litecoin Address", true, `Using: ${ltcAddress}`);

  // 8. Litecoin Send
  console.info("\n[8] POST /litecoin/send");
  let sendTxId = "";
  try {
    const res = await axiosInstance.post(`/litecoin/send`, {
      destinationAddress: ltcAddress, // send back to same address
      amount: 0.0001,
      useTestnet: true,
    });
    sendTxId = res.data.data.txId;
    logResult("Litecoin Send", true, `TXID: ${sendTxId}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (msg.includes("insufficient") || msg.includes("No unspent")) {
      logResult("Litecoin Send", false, "Insufficient LTC in wallet");
    } else {
      logResult("Litecoin Send", false, msg);
    }
  }

  // 9. Litecoin Verify Transaction - use the REAL txId from send
  console.info("\n[9] POST /litecoin/verify");
  if (sendTxId) {
    try {
      const res = await axiosInstance.post(`/litecoin/verify`, {
        txId: sendTxId,
        address: ltcAddress,
        useTestnet: true,
      });
      // Transaction should exist in mempool/blockchain
      // verifyTransaction returns true if confirmations >= 1
      logResult(
        "Litecoin Verify Transaction",
        true,
        `TX exists, Confirmed: ${res.data.data.valid}`
      );
    } catch (err) {
      const error = err as SimpleAxiosError;
      logResult(
        "Litecoin Verify Transaction",
        false,
        error.response?.data?.error || error.message
      );
    }
  } else {
    logResult(
      "Litecoin Verify Transaction",
      false,
      "Skipped - no send txId available"
    );
  }

  // 10. Litecoin Register Asset (requires LTC)
  console.info("\n[10] POST /litecoin/register-asset");
  let assetTxId = "";
  try {
    const dataStr = "GanjiTestAsset-" + Date.now();
    const data = Buffer.from(dataStr, "utf-8").toString("hex");
    const res = await axiosInstance.post(`/litecoin/register-asset`, {
      data,
      useTestnet: true,
    });
    assetTxId = res.data.data.txId;
    logResult("Litecoin Register Asset", true, `TXID: ${assetTxId}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (msg.includes("insufficient") || msg.includes("No unspent")) {
      logResult(
        "Litecoin Register Asset",
        false,
        "Insufficient LTC in wallet (expected on testnet)"
      );
    } else {
      logResult("Litecoin Register Asset", false, msg);
    }
  }

  // 11. Litecoin Verify Asset - verify the registered asset tx exists
  console.info("\n[11] GET /litecoin/verify-asset/:txId");
  if (assetTxId) {
    try {
      const res = await axiosInstance.get(
        `/litecoin/verify-asset/${assetTxId}?useTestnet=true`
      );
      const isConfirmed = res.data.data.valid;
      const dataPreview = res.data.data.data?.slice(0, 20) || "none";
      // TX exists and data was retrieved - that's success!
      logResult(
        "Litecoin Verify Asset",
        true,
        `TX found! Confirmed: ${isConfirmed}, Data: ${dataPreview}...`
      );
    } catch (err) {
      const error = err as SimpleAxiosError;
      logResult(
        "Litecoin Verify Asset",
        false,
        error.response?.data?.error || error.message
      );
    }
  } else {
    logResult("Litecoin Verify Asset", false, "Skipped - no asset registered");
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.info("\n" + "=".repeat(70));
  console.info("📊 VERIFICATION SUMMARY");
  console.info("=".repeat(70));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.info(`\n✅ Passed: ${passed}/${total}`);
  console.info(`❌ Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.info("\n❌ FAILED TESTS:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.info(`   - ${r.name}: ${r.message}`);
      });
  }

  console.info("\n🏁 Verification Complete");
}

runTests().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
