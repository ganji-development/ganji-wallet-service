import { env } from "./env.js";

export const litecoinConfig = {
  rpc: {
    url: env.LITECOIN_RPC_URL,
    username: env.LITECOIN_RPC_USER,
    password: env.LITECOIN_RPC_PASS,
  },
  network: env.NODE_ENV === "production" ? "mainnet" : "testnet",
};
