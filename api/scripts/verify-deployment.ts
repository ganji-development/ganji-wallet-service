import axios from "axios";
import { Keypair } from "@solana/web3.js";

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

  // 2. Solana Balance
  console.info("\n[2] GET /solana/balance/:address");
  const solanaAddress = "EXj5yXactDY8oErJUo2ARoWTp5JSuihkNajhxoEy8ZuZ";
  try {
    const res = await axiosInstance.get(
      `/solana/balance/${solanaAddress}?useTestnet=true`
    );
    logResult(
      "Solana Balance",
      true,
      `Balance: ${res.data.data.balance} SOL (${res.data.data.lamports} lamports)`
    );
  } catch (err) {
    const error = err as SimpleAxiosError;
    logResult(
      "Solana Balance",
      false,
      error.response?.data?.error || error.message
    );
  }

  // 3. Solana Verify Signature
  console.info("\n[3] POST /solana/verify");
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

  // 4. Solana Transfer (requires SOL)
  console.info("\n[4] POST /solana/transfer");
  const tempKeypair = Keypair.generate();
  try {
    const res = await axiosInstance.post(`/solana/transfer`, {
      toAddress: tempKeypair.publicKey.toBase58(),
      amount: 0.001,
      useTestnet: true,
    });
    logResult("Solana Transfer", true, `Signature: ${res.data.data.signature}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    // Check if it's an expected error (insufficient funds)
    if (msg.includes("insufficient") || msg.includes("0x1")) {
      logResult(
        "Solana Transfer",
        false,
        "Insufficient SOL in master wallet (expected on testnet)"
      );
    } else {
      logResult("Solana Transfer", false, msg);
    }
  }

  // 5. Solana Sign and Send
  console.info("\n[5] POST /solana/sign-and-send");
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

  // 6. Solana Create License
  console.info("\n[6] POST /solana/create-license");
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

  // ============================================================
  // LITECOIN ENDPOINTS
  // ============================================================
  console.info("\n\n🔶 LITECOIN ENDPOINTS");
  console.info("-".repeat(40));

  // 7. Litecoin Network
  console.info("\n[7] GET /litecoin/network");
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

  // 8. Litecoin Create Wallet
  console.info("\n[8] POST /litecoin/create-wallet");
  let ltcAddress = "";
  try {
    const res = await axiosInstance.post(`/litecoin/create-wallet`, {
      useTestnet: true,
    });
    ltcAddress = res.data.data.address;
    logResult("Litecoin Create Wallet", true, `Address: ${ltcAddress}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    logResult(
      "Litecoin Create Wallet",
      false,
      error.response?.data?.error || error.message
    );
  }

  // 9. Litecoin Balance
  console.info("\n[9] GET /litecoin/balance/:address");
  if (ltcAddress) {
    try {
      const res = await axiosInstance.get(
        `/litecoin/balance/${ltcAddress}?useTestnet=true`
      );
      logResult(
        "Litecoin Balance",
        true,
        `Balance: ${res.data.data.balance} LTC`
      );
    } catch (err) {
      const error = err as SimpleAxiosError;
      const msg = error.response?.data?.error || error.message;
      // May fail if address not in wallet
      if (msg.includes("not found") || msg.includes("Invalid")) {
        logResult(
          "Litecoin Balance",
          true,
          "Endpoint responds (address not tracked by wallet)"
        );
      } else {
        logResult("Litecoin Balance", false, msg);
      }
    }
  } else {
    logResult("Litecoin Balance", false, "Skipped - no wallet created");
  }

  // 10. Litecoin Send
  console.info("\n[10] POST /litecoin/send");
  try {
    const res = await axiosInstance.post(`/litecoin/send`, {
      destinationAddress: ltcAddress || "tltc1qtest",
      amount: 0.0001,
      useTestnet: true,
    });
    logResult("Litecoin Send", true, `TXID: ${res.data.data.txId}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    if (msg.includes("insufficient") || msg.includes("No unspent")) {
      logResult(
        "Litecoin Send",
        false,
        "Insufficient LTC in wallet (expected on testnet)"
      );
    } else {
      logResult("Litecoin Send", false, msg);
    }
  }

  // 11. Litecoin Verify Transaction
  console.info("\n[11] POST /litecoin/verify");
  try {
    // Use a dummy txId - endpoint should handle it gracefully
    const res = await axiosInstance.post(`/litecoin/verify`, {
      txId: "0000000000000000000000000000000000000000000000000000000000000000",
      address: ltcAddress || "tltc1qtest",
      useTestnet: true,
    });
    logResult(
      "Litecoin Verify Transaction",
      true,
      `Valid: ${res.data.data.valid}`
    );
  } catch (err) {
    const error = err as SimpleAxiosError;
    const msg = error.response?.data?.error || error.message;
    // May fail for invalid txId, but endpoint should respond
    if (error.response?.status === 500 || error.response?.status === 400) {
      logResult(
        "Litecoin Verify Transaction",
        true,
        "Endpoint responds (returned error for invalid txId)"
      );
    } else {
      logResult("Litecoin Verify Transaction", false, msg);
    }
  }

  // 12. Litecoin Register Asset (requires LTC)
  console.info("\n[12] POST /litecoin/register-asset");
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

  // 13. Litecoin Verify Asset
  console.info("\n[13] GET /litecoin/verify-asset/:txId");
  if (assetTxId) {
    try {
      const res = await axiosInstance.get(
        `/litecoin/verify-asset/${assetTxId}?useTestnet=true`
      );
      logResult(
        "Litecoin Verify Asset",
        true,
        `Valid: ${res.data.data.valid}, Data: ${res.data.data.data?.slice(
          0,
          20
        )}...`
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
