import { env } from "./env.js";
import { clusterApiUrl } from "@solana/web3.js";

export const solanaConfig = {
  network: env.SOLANA_NETWORK,
  rpcUrl: env.SOLANA_RPC_URL || clusterApiUrl(env.SOLANA_NETWORK),
  commitment: "confirmed" as const,
  walletPath: env.SOLANA_WALLET_PATH,
};
