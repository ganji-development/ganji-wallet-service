import axios from "axios";
// // import { env } from '../src/config/env.js';

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
});

interface SimpleAxiosError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message: string;
}

async function runTests() {
  console.info(
    "🚀 Starting Verification Tests on cnode.ganjidevelopment.com..."
  );

  // 1. Health Check
  try {
    const res = await axios.get("https://cnode.ganjidevelopment.com/health");
    console.info(`✅ Health Check: ${res.status} ${res.statusText}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Health Check Failed: ${message}`);
  }

  // 2. Solana Devnet Balance
  try {
    const address = "EXj5yXactDY8oErJUo2ARoWTp5JSuihkNajhxoEy8ZuZ"; // Devnet address
    const res = await axiosInstance.get(
      `/solana/balance/${address}?useTestnet=true`
    );
    console.info(`✅ Solana Devnet Balance: ${JSON.stringify(res.data.data)}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    console.error(
      `❌ Solana Devnet Balance Failed: ${
        error.response?.data?.error || error.message
      }`
    );
  }

  // 3. Litecoin Testnet Network Info
  try {
    // Note: This might fail if the VPS has mainnet configured but verify-deployment script runs locally against remote which has mainnet disabled?
    // Wait, network info reads connection count etc from the node.
    const res = await axiosInstance.get(`/litecoin/network?useTestnet=true`);
    console.info(
      `✅ Litecoin Network Info: Version ${res.data.data.version}, Connections: ${res.data.data.connections}`
    );
  } catch (err) {
    const error = err as SimpleAxiosError;
    console.error(
      `❌ Litecoin Network Info Failed: ${
        error.response?.data?.error || error.message
      }`
    );
  }

  // 4. Create Litecoin Wallet (Testnet)
  let ltcAddress = "";
  try {
    const res = await axiosInstance.post(`/litecoin/create-wallet`, {
      useTestnet: true,
    });
    ltcAddress = res.data.data.address;
    console.info(`✅ Created Litecoin Wallet: ${ltcAddress}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    console.error(
      `❌ Create Litecoin Wallet Failed: ${
        error.response?.data?.error || error.message
      }`
    );
  }

  // 5. Litecoin register asset (Testnet) - expects OP_RETURN
  let txId = "";
  try {
    const dataStr = "GanjiTestAsset-" + Date.now();
    const data = Buffer.from(dataStr, "utf-8").toString("hex");
    const res = await axiosInstance.post(`/litecoin/register-asset`, {
      data,
      useTestnet: true,
    });
    txId = res.data.data.txId;
    console.info(`✅ Registered Asset: ${txId}`);
  } catch (err) {
    const error = err as SimpleAxiosError;
    console.error(
      `❌ Register Asset Failed: ${
        error.response?.data?.error || error.message
      }`
    );
    // Likely to fail if wallet has no funds
  }

  // 6. Verify Asset (if we got a txId)
  if (txId) {
    try {
      const res = await axiosInstance.get(
        `/litecoin/verify-asset/${txId}?useTestnet=true`
      );
      console.info(`✅ Verified Asset: Valid=${res.data.data.valid}`);
    } catch (err) {
      const error = err as SimpleAxiosError;
      console.error(
        `❌ Verify Asset Failed: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  console.info("🏁 Verification Complete");
}

runTests();
