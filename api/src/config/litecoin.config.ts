import { env } from "./env.js";

export const litecoinConfig = {
  testnet: {
    url: env.LITECOIN_TESTNET_RPC_URL,
    username: env.LITECOIN_TESTNET_RPC_USER,
    password: env.LITECOIN_TESTNET_RPC_PASS,
  },
  mainnet: {
    url: env.LITECOIN_MAINNET_RPC_URL,
    username: env.LITECOIN_MAINNET_RPC_USER,
    password: env.LITECOIN_MAINNET_RPC_PASS,
  },
};
