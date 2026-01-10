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
  SOLANA_RPC_URL: z.string().pipe(z.url()),
  SOLANA_NETWORK: z
    .enum(["mainnet-beta", "testnet", "devnet"])
    .default("devnet"),
  SOLANA_WALLET_PATH: z.string().default("./secrets/master-keypair.json"),

  // Litecoin
  LITECOIN_RPC_URL: z.string().pipe(z.url()),
  LITECOIN_RPC_USER: z.string(),
  LITECOIN_RPC_PASS: z.string(),

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
        z.treeifyError(error).errors
      );
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
};

export const env = validateEnv();
