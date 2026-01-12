import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

console.info(`Current working directory: ${process.cwd()}`);
console.info(`__dirname: ${__dirname}`);

const possiblePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../.env"),
];

let envLoaded = false;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    console.info(`Found .env at: ${p}`);
    const result = dotenv.config({ path: p });
    if (result.error) {
      console.warn(`⚠️  Failed to load .env from ${p}:`, result.error.message);
    } else {
      envLoaded = true;
      console.info("✅ .env loaded successfully");
      break;
    }
  }
}

if (!envLoaded) {
  console.warn("⚠️  No .env file found in any of the searched locations.");
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000").transform(Number),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Solana
  SOLANA_TESTNET_RPC_URL: z.string().pipe(z.url()),
  SOLANA_TESTNET_WALLET_PATH: z
    .string()
    .default("./secrets/master-keypair-testnet.json"),
  GANJI_TESTNET_TOKEN_MINT: z.string().min(32),
  SOLANA_TESTNET_LICENSE_PROGRAM_ID: z.string().min(32),

  SOLANA_MAINNET_RPC_URL: z.string().pipe(z.url()),
  SOLANA_MAINNET_WALLET_PATH: z
    .string()
    .default("./secrets/master-keypair-mainnet.json"),
  GANJI_MAINNET_TOKEN_MINT: z.string().min(32),
  SOLANA_MAINNET_LICENSE_PROGRAM_ID: z.string().min(32),

  // Litecoin
  LITECOIN_TESTNET_RPC_URL: z.string().pipe(z.url()),
  LITECOIN_TESTNET_RPC_USER: z.string(),
  LITECOIN_TESTNET_RPC_PASS: z.string(),

  LITECOIN_MAINNET_RPC_URL: z.string().pipe(z.url()),
  LITECOIN_MAINNET_RPC_USER: z.string(),
  LITECOIN_MAINNET_RPC_PASS: z.string(),

  // Auth
  AUTH_API_KEY: z.string().min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(error.format(), null, 2)
      );
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
};

export const env = validateEnv();
