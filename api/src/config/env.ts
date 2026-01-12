import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

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

  // Solana Mainnet (optional - not yet in use)
  SOLANA_MAINNET_RPC_URL: z.string().pipe(z.url()).optional(),
  SOLANA_MAINNET_WALLET_PATH: z.string().optional(),
  GANJI_MAINNET_TOKEN_MINT: z.string().min(32).optional(),
  SOLANA_MAINNET_LICENSE_PROGRAM_ID: z.string().min(32).optional(),

  // Litecoin Testnet
  LITECOIN_TESTNET_RPC_URL: z.string().pipe(z.url()),
  LITECOIN_TESTNET_RPC_USER: z.string(),
  LITECOIN_TESTNET_RPC_PASS: z.string(),

  // Litecoin Mainnet (optional - not yet in use)
  LITECOIN_MAINNET_RPC_URL: z.string().pipe(z.url()).optional(),
  LITECOIN_MAINNET_RPC_USER: z.string().optional(),
  LITECOIN_MAINNET_RPC_PASS: z.string().optional(),

  // Auth
  AUTH_API_KEY: z.string().min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
};

export const env = validateEnv();
