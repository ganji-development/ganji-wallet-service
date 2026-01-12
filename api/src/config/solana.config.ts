import { env } from "./env.js";

export const solanaConfig = {
  testnet: {
    rpcUrl: env.SOLANA_TESTNET_RPC_URL,
    walletPath: env.SOLANA_TESTNET_WALLET_PATH,
    tokenMint: env.GANJI_TESTNET_TOKEN_MINT,
    programId: env.SOLANA_TESTNET_LICENSE_PROGRAM_ID,
    commitment: "confirmed" as const,
  },
  mainnet: {
    rpcUrl: env.SOLANA_MAINNET_RPC_URL,
    walletPath: env.SOLANA_MAINNET_WALLET_PATH,
    tokenMint: env.GANJI_MAINNET_TOKEN_MINT,
    programId: env.SOLANA_MAINNET_LICENSE_PROGRAM_ID,
    commitment: "confirmed" as const,
  },
};
